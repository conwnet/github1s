grammar_file_path = joinpath(@__DIR__, "../syntaxes/julia.json")

# convert cson to json
json = Ref(read(grammar_file_path, String))

# apply substitutions
sub!(pr) = json.x = replace(json.x, pr; count = typemax(Int))

sub!(r"(\"include\"\s*:\s*\")source\.gfm(\")" => s"\1text.html.markdown.julia\2")

# Skip over-zealous top-level production in `source.cpp`. See offending pattern here:
# https://github.com/microsoft/vscode/blob/c3fe2d8acde04e579880413ae4622a1f551efdcc/extensions/cpp/syntaxes/cpp.tmLanguage.json#L745
sub!(r"(\"include\"\s*:\s*\"source\.cpp)(\")" => s"\1#root_context\2")

# Choose content names consistent with the vscode conventions for embedded code. Cf.:
# https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide#embedded-languages
sub!(r"(\"contentName\"\s*:\s*\")source\.cpp(\")" => s"\1meta.embedded.inline.cpp\2")
sub!(r"(\"contentName\"\s*:\s*\")source\.gfm(\")" => s"\1meta.embedded.inline.markdown\2")
sub!(r"(\"contentName\"\s*:\s*\")source\.js(\")" => s"\1meta.embedded.inline.javascript\2")
sub!(r"(\"contentName\"\s*:\s*\")source\.r(\")" => s"\1meta.embedded.inline.r\2")
sub!(r"(\"contentName\"\s*:\s*\")source\.python(\")" => s"\1meta.embedded.inline.python\2")

# print out the transformed syntax
open(grammar_file_path, "w") do f
    println(f, json.x)
end
