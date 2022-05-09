/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposableStore } from 'vs/base/common/lifecycle';
import { cloneAndChange, mixin } from 'vs/base/common/objects';
import { isWeb } from 'vs/base/common/platform';
import { escapeRegExpCharacters } from 'vs/base/common/strings';
import { localize } from 'vs/nls';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { ConfigurationScope, Extensions, IConfigurationRegistry } from 'vs/platform/configuration/common/configurationRegistry';
import product from 'vs/platform/product/common/product';
import { IProductService } from 'vs/platform/product/common/productService';
import { Registry } from 'vs/platform/registry/common/platform';
import { ClassifiedEvent, GDPRClassification, StrictPropertyCheck } from 'vs/platform/telemetry/common/gdprTypings';
import { ITelemetryData, ITelemetryInfo, ITelemetryService, TelemetryConfiguration, TelemetryLevel, TELEMETRY_OLD_SETTING_ID, TELEMETRY_SECTION_ID, TELEMETRY_SETTING_ID } from 'vs/platform/telemetry/common/telemetry';
import { getTelemetryLevel, ITelemetryAppender } from 'vs/platform/telemetry/common/telemetryUtils';

export interface ITelemetryServiceConfig {
	appenders: ITelemetryAppender[];
	sendErrorTelemetry?: boolean;
	commonProperties?: Promise<{ [name: string]: any }>;
	piiPaths?: string[];
}

export class TelemetryService implements ITelemetryService {

	static readonly IDLE_START_EVENT_NAME = 'UserIdleStart';
	static readonly IDLE_STOP_EVENT_NAME = 'UserIdleStop';

	declare readonly _serviceBrand: undefined;

	private _appenders: ITelemetryAppender[];
	private _commonProperties: Promise<{ [name: string]: any }>;
	private _experimentProperties: { [name: string]: string } = {};
	private _piiPaths: string[];
	private _telemetryLevel: TelemetryLevel;
	private _sendErrorTelemetry: boolean;

	private readonly _disposables = new DisposableStore();
	private _cleanupPatterns: RegExp[] = [];

	constructor(
		config: ITelemetryServiceConfig,
		@IConfigurationService private _configurationService: IConfigurationService,
		@IProductService private _productService: IProductService
	) {
		this._appenders = config.appenders;
		this._commonProperties = config.commonProperties || Promise.resolve({});
		this._piiPaths = config.piiPaths || [];
		this._telemetryLevel = TelemetryLevel.USAGE;
		this._sendErrorTelemetry = !!config.sendErrorTelemetry;

		// static cleanup pattern for: `file:///DANGEROUS/PATH/resources/app/Useful/Information`
		this._cleanupPatterns = [/file:\/\/\/.*?\/resources\/app\//gi];

		for (let piiPath of this._piiPaths) {
			this._cleanupPatterns.push(new RegExp(escapeRegExpCharacters(piiPath), 'gi'));
		}


		this._updateTelemetryLevel();
		this._configurationService.onDidChangeConfiguration(this._updateTelemetryLevel, this, this._disposables);
	}

	setExperimentProperty(name: string, value: string): void {
		this._experimentProperties[name] = value;
	}

	private _updateTelemetryLevel(): void {
		this._telemetryLevel = getTelemetryLevel(this._configurationService);
		const collectableTelemetry = this._productService.enabledTelemetryLevels;
		// Also ensure that error telemetry is respecting the product configuration for collectable telemetry
		if (collectableTelemetry) {
			this._sendErrorTelemetry = this.sendErrorTelemetry ? collectableTelemetry.error : false;
			// Make sure the telemetry level from the service is the minimum of the config and product
			const maxCollectableTelemetryLevel = collectableTelemetry.usage ? TelemetryLevel.USAGE : collectableTelemetry.error ? TelemetryLevel.ERROR : TelemetryLevel.NONE;
			this._telemetryLevel = Math.min(this._telemetryLevel, maxCollectableTelemetryLevel);
		}
	}

	get telemetryLevel(): TelemetryLevel {
		return this._telemetryLevel;
	}

	get sendErrorTelemetry(): boolean {
		return this._sendErrorTelemetry;
	}

	async getTelemetryInfo(): Promise<ITelemetryInfo> {
		const values = await this._commonProperties;

		// well known properties
		let sessionId = values['sessionID'];
		let machineId = values['common.machineId'];
		let firstSessionDate = values['common.firstSessionDate'];
		let msftInternal = values['common.msftInternal'];

		return { sessionId, machineId, firstSessionDate, msftInternal };
	}

	dispose(): void {
		this._disposables.dispose();
	}

	private _log(eventName: string, eventLevel: TelemetryLevel, data?: ITelemetryData, anonymizeFilePaths?: boolean): Promise<any> {
		// don't send events when the user is optout
		if (this.telemetryLevel < eventLevel) {
			return Promise.resolve(undefined);
		}

		return this._commonProperties.then(values => {

			// (first) add common properties
			data = mixin(data, values);

			// (next) add experiment properties
			data = mixin(data, this._experimentProperties);

			// (last) remove all PII from data
			data = cloneAndChange(data, value => {
				if (typeof value === 'string') {
					return this._cleanupInfo(value, anonymizeFilePaths);
				}
				return undefined;
			});

			// Log to the appenders of sufficient level
			this._appenders.forEach(a => a.log(eventName, data));

		}, err => {
			// unsure what to do now...
			console.error(err);
		});
	}

	publicLog(eventName: string, data?: ITelemetryData, anonymizeFilePaths?: boolean): Promise<any> {
		return this._log(eventName, TelemetryLevel.USAGE, data, anonymizeFilePaths);
	}

	publicLog2<E extends ClassifiedEvent<T> = never, T extends GDPRClassification<T> = never>(eventName: string, data?: StrictPropertyCheck<T, E>, anonymizeFilePaths?: boolean): Promise<any> {
		return this.publicLog(eventName, data as ITelemetryData, anonymizeFilePaths);
	}

	publicLogError(errorEventName: string, data?: ITelemetryData): Promise<any> {
		if (!this._sendErrorTelemetry) {
			return Promise.resolve(undefined);
		}

		// Send error event and anonymize paths
		return this._log(errorEventName, TelemetryLevel.ERROR, data, true);
	}

	publicLogError2<E extends ClassifiedEvent<T> = never, T extends GDPRClassification<T> = never>(eventName: string, data?: StrictPropertyCheck<T, E>): Promise<any> {
		return this.publicLogError(eventName, data as ITelemetryData);
	}

	private _anonymizeFilePaths(stack: string): string {
		let updatedStack = stack;

		const cleanUpIndexes: [number, number][] = [];
		for (let regexp of this._cleanupPatterns) {
			while (true) {
				const result = regexp.exec(stack);
				if (!result) {
					break;
				}
				cleanUpIndexes.push([result.index, regexp.lastIndex]);
			}
		}

		const nodeModulesRegex = /^[\\\/]?(node_modules|node_modules\.asar)[\\\/]/;
		const fileRegex = /(file:\/\/)?([a-zA-Z]:(\\\\|\\|\/)|(\\\\|\\|\/))?([\w-\._]+(\\\\|\\|\/))+[\w-\._]*/g;
		let lastIndex = 0;
		updatedStack = '';

		while (true) {
			const result = fileRegex.exec(stack);
			if (!result) {
				break;
			}
			// Anoynimize user file paths that do not need to be retained or cleaned up.
			if (!nodeModulesRegex.test(result[0]) && cleanUpIndexes.every(([x, y]) => result.index < x || result.index >= y)) {
				updatedStack += stack.substring(lastIndex, result.index) + '<REDACTED: user-file-path>';
				lastIndex = fileRegex.lastIndex;
			}
		}
		if (lastIndex < stack.length) {
			updatedStack += stack.substr(lastIndex);
		}

		return updatedStack;
	}

	private _removePropertiesWithPossibleUserInfo(property: string): string {
		// If for some reason it is undefined we skip it (this shouldn't be possible);
		if (!property) {
			return property;
		}

		const value = property.toLowerCase();

		const emailRegex = /@[a-zA-Z0-9-.]+/; // Regex which matches @*.site
		const secretRegex = /(key|token|sig|signature|password|passwd|pwd|android:value)[^a-zA-Z0-9]/;
		const tokenRegex = /xox[pbaors]\-[a-zA-Z0-9]+\-[a-zA-Z0-9\-]+?/; // last +? is lazy as a microoptimization since we don't care about the full value

		// Check for common user data in the telemetry events
		if (secretRegex.test(value)) {
			return '<REDACTED: secret>';
		} else if (emailRegex.test(value)) {
			return '<REDACTED: email>';
		} else if (tokenRegex.test(value)) {
			return '<REDACTED: token>';
		}

		return property;
	}


	private _cleanupInfo(property: string, anonymizeFilePaths?: boolean): string {
		let updatedProperty = property;

		// anonymize file paths
		if (anonymizeFilePaths) {
			updatedProperty = this._anonymizeFilePaths(updatedProperty);
		}

		// sanitize with configured cleanup patterns
		for (let regexp of this._cleanupPatterns) {
			updatedProperty = updatedProperty.replace(regexp, '');
		}

		// remove possible user info
		updatedProperty = this._removePropertiesWithPossibleUserInfo(updatedProperty);

		return updatedProperty;
	}
}

function getTelemetryLevelSettingDescription(): string {
	const telemetryText = localize('telemetry.telemetryLevelMd', "Controls {0} telemetry, first-party extension telemetry and participating third-party extension telemetry. Some third party extensions might not respect this setting. Consult the specific extension's documentation to be sure. Telemetry helps us better understand how {0} is performing, where improvements need to be made, and how features are being used.", product.nameLong);
	const externalLinksStatement = !product.privacyStatementUrl ?
		localize("telemetry.docsStatement", "Read more about the [data we collect]({0}).", 'https://aka.ms/vscode-telemetry') :
		localize("telemetry.docsAndPrivacyStatement", "Read more about the [data we collect]({0}) and our [privacy statement]({1}).", 'https://aka.ms/vscode-telemetry', product.privacyStatementUrl);
	const restartString = !isWeb ? localize('telemetry.restart', 'A full restart of the application is necessary for crash reporting changes to take effect.') : '';

	const crashReportsHeader = localize('telemetry.crashReports', "Crash Reports");
	const errorsHeader = localize('telemetry.errors', "Error Telemetry");
	const usageHeader = localize('telemetry.usage', "Usage Data");

	const telemetryTableDescription = localize('telemetry.telemetryLevel.tableDescription', "The following table outlines the data sent with each setting:");
	const telemetryTable = `
|       | ${crashReportsHeader} | ${errorsHeader} | ${usageHeader} |
|:------|:---------------------:|:---------------:|:--------------:|
| all   |            ✓          |        ✓        |        ✓       |
| error |            ✓          |        ✓        |        -       |
| crash |            ✓          |        -        |        -       |
| off   |            -          |        -        |        -       |
`;

	const deprecatedSettingNote = localize('telemetry.telemetryLevel.deprecated', "****Note:*** If this setting is 'off', no telemetry will be sent regardless of other telemetry settings. If this setting is set to anything except 'off' and telemetry is disabled with deprecated settings, no telemetry will be sent.*");
	const telemetryDescription = `
${telemetryText} ${externalLinksStatement} ${restartString}

&nbsp;

${telemetryTableDescription}
${telemetryTable}

&nbsp;

${deprecatedSettingNote}
`;

	return telemetryDescription;
}

Registry.as<IConfigurationRegistry>(Extensions.Configuration).registerConfiguration({
	'id': TELEMETRY_SECTION_ID,
	'order': 110,
	'type': 'object',
	'title': localize('telemetryConfigurationTitle', "Telemetry"),
	'properties': {
		[TELEMETRY_SETTING_ID]: {
			'type': 'string',
			'enum': [TelemetryConfiguration.ON, TelemetryConfiguration.ERROR, TelemetryConfiguration.CRASH, TelemetryConfiguration.OFF],
			'enumDescriptions': [
				localize('telemetry.telemetryLevel.default', "Sends usage data, errors, and crash reports."),
				localize('telemetry.telemetryLevel.error', "Sends general error telemetry and crash reports."),
				localize('telemetry.telemetryLevel.crash', "Sends OS level crash reports."),
				localize('telemetry.telemetryLevel.off', "Disables all product telemetry.")
			],
			'markdownDescription': getTelemetryLevelSettingDescription(),
			'default': TelemetryConfiguration.ON,
			'restricted': true,
			'scope': ConfigurationScope.APPLICATION,
			'tags': ['usesOnlineServices', 'telemetry']
		}
	}
});

// Deprecated telemetry setting
Registry.as<IConfigurationRegistry>(Extensions.Configuration).registerConfiguration({
	'id': TELEMETRY_SECTION_ID,
	'order': 110,
	'type': 'object',
	'title': localize('telemetryConfigurationTitle', "Telemetry"),
	'properties': {
		[TELEMETRY_OLD_SETTING_ID]: {
			'type': 'boolean',
			'markdownDescription':
				!product.privacyStatementUrl ?
					localize('telemetry.enableTelemetry', "Enable diagnostic data to be collected. This helps us to better understand how {0} is performing and where improvements need to be made.", product.nameLong) :
					localize('telemetry.enableTelemetryMd', "Enable diagnostic data to be collected. This helps us to better understand how {0} is performing and where improvements need to be made. [Read more]({1}) about what we collect and our privacy statement.", product.nameLong, product.privacyStatementUrl),
			// below codes are changed by github1s
			// disable telemetry by default https://github.com/conwnet/github1s/issues/196
			'default': false,
			// above codes are changed by github1s
			'restricted': true,
			'markdownDeprecationMessage': localize('enableTelemetryDeprecated', "If this setting is false, no telemetry will be sent regardless of the new setting's value. Deprecated in favor of the {0} setting.", `\`#${TELEMETRY_SETTING_ID}#\``),
			'scope': ConfigurationScope.APPLICATION,
			'tags': ['usesOnlineServices', 'telemetry']
		}
	}
});

