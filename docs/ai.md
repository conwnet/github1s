# GitHub1s AI

[Documentation](guide.md) · [Using GitHub1s](usage.md)

GitHub1s AI is the built-in assistant for asking questions about a repository. It can explain attached files or selections and use repository tools to find relevant code. You configure the model endpoint and API key used for each conversation.

## Configure a model

1. Click **Toggle Secondary Side Bar** in the layout controls at the top of GitHub1s to open the AI panel.
2. Click the gear icon at the top of the AI panel, then select **Models → Add model**.
3. Enter a **Name**, choose a **Provider** and, where available, a **Protocol**.
4. Set the **Base URL**, **API key**, and **Model ID** for an endpoint you can access from your browser.
5. Select **Save Model**, then click **Back to chat**.

You can also open the Command Palette (`F1`) and run **GitHub1s AI: Open Chat** or **GitHub1s AI: Open AI Settings**.

The first saved model is selected automatically. With multiple configurations, use the model selector in the chat composer to choose one.

### Providers and protocols

| Provider  | Default protocol        | Other supported protocols            | Default base URL               |
| --------- | ----------------------- | ------------------------------------ | ------------------------------ |
| Custom    | OpenAI Chat Completions | OpenAI Responses, Anthropic Messages | Supply your endpoint           |
| OpenAI    | OpenAI Responses        | OpenAI Chat Completions              | `https://api.openai.com/v1`    |
| Anthropic | Anthropic Messages      | —                                    | `https://api.anthropic.com/v1` |

Use the API base URL, such as `https://api.example.com/v1`, rather than a complete generation-request URL. The URL must use HTTP or HTTPS and cannot contain credentials, a query string, or a fragment. Use a model ID available through your endpoint.

### Browser access

Model requests originate in your browser. The endpoint must support browser requests, including the necessary cross-origin resource sharing (CORS) headers. An endpoint that works from a server-side script may still reject a browser request. Local endpoints can also be affected by the browser's HTTPS and local-network access rules.

## Ask questions with context

Start with **Repository overview**, **Explain current file**, or **Explain selection**, or type a question in the chat composer.

Use the composer toolbar's **Add file…**, **Attach current file**, or **Attach current selection** buttons. The editor action **Add to GitHub1s AI Chat** attaches the selection when one exists, or the current file otherwise.

Attached content is read when you send the message. Remove a pending attachment with its remove button before sending. Click an attachment chip to open its source file or selection.

**Include recent files** is enabled by default. It adds up to five recently viewed file paths to the model's context; the assistant can then read those files with its tools. Turn it off in the composer when those paths are not relevant to the question.

**New Chat** starts a separate conversation and clears pending attachments. Previous conversations remain available through **GitHub1s AI: Show History**.

### Customize responses

In **AI Settings → Prompts**, add preferences such as the response language under **User Rules**, then select **Save prompts**. **Instructions** replaces the default assistant instructions, and **Quick Actions** customizes the starter questions. Leave instruction or quick-action fields empty to use their defaults. **Reset** updates the form; select **Save prompts** to save the reset values.

## Repository tools

The assistant has four built-in tools:

| Tool     | Purpose                              |
| -------- | ------------------------------------ |
| `read`   | Read a text file or a range of lines |
| `ls`     | List a directory                     |
| `glob`   | Find files by a path pattern         |
| `search` | Search text in files                 |

These tools read within the open workspace. Results are bounded: for example, `read` accepts files up to 5 MiB and returns at most 2,000 lines per call. Long lines and tool output can be truncated, and searches depend on the workspace's search provider. These are tool limits; attached files use a separate context-loading path.

For a large repository, ask about a specific directory, file, or symbol so the assistant can retrieve focused context.

## Connect MCP servers

Model Context Protocol (MCP) servers add tools to the chat. Open **GitHub1s AI: Open AI Settings**, select **MCP**, and enter a configuration such as:

```json
{
	"mcpServers": {
		"example": {
			"type": "http",
			"url": "https://example.com/mcp",
			"headers": {
				"Authorization": "Bearer YOUR_TOKEN"
			}
		}
	}
}
```

Replace the example URL and token, then select **Save MCP settings**. Changes apply to the next response. Supported transports are `http` and `sse`; local `stdio` servers are unavailable in the browser. Headers are optional, and the server must allow browser access.

Configured MCP tools become available to the assistant. Their capabilities determine which external actions it can perform; they are not restricted by the built-in repository tools' read-only behavior. Connect servers whose tools you intend the assistant to use.

Save `{ "mcpServers": {} }` to remove all configured MCP connections.

## Data and storage

| Data                                                                   | Where it goes                                                                                                |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Model configuration, including API keys                                | Saved in browser-backed VS Code extension global state; the selected credentials are used for model requests |
| Messages, attached code, recent file paths, and retrieved tool results | Included in requests to the configured model endpoint as conversation context                                |
| Conversation history                                                   | Saved in browser-backed extension storage, separated by workspace                                            |
| MCP configuration and credentials                                      | Saved in extension global state; used to connect to the configured servers                                   |
| MCP tool calls                                                         | Sent to the corresponding server; their results become available to the model                                |

The model and MCP services receive the data sent to them under their own service policies. Select endpoints appropriate for the repository content you plan to discuss.

### Manage saved data

- **Delete one conversation:** open **Show History**, use its delete action, and confirm **Delete**.
- **Export conversations:** in AI Settings, open **General → Export history → Export**. The JSON contains conversation data for the current workspace, including stored message and tool content.
- **Reset AI data:** in **General**, select **Clear all data** and confirm. This removes local AI conversations across all workspaces, model settings and API keys, MCP settings, and prompt settings.

## Troubleshooting

| Message or symptom                         | What to check                                                                       |
| ------------------------------------------ | ----------------------------------------------------------------------------------- |
| `Select a model before sending a message.` | Add a model and select it in the composer                                           |
| Authentication failure                     | Check the API key and the endpoint account's access                                 |
| Endpoint or model not found                | Check the base URL, protocol, and model ID                                          |
| Unable to reach the endpoint               | Check network access, CORS, and browser restrictions on the endpoint                |
| Rate limit reached                         | Follow the model service's retry guidance                                           |
| Missing repository context                 | Attach the relevant file or selection; check whether repository search is available |
| Unable to load MCP tools                   | Check the server URL, credentials, CORS support, and tool-name conflicts            |
