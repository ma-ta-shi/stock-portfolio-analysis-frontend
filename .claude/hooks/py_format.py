import json, subprocess, sys

data = json.load(sys.stdin)
fp = data.get("tool_input", {}).get("file_path", "")
if fp and fp.endswith(".py"):
    subprocess.run(["ruff", "format", fp], capture_output=True)
    subprocess.run(["ruff", "check", "--fix", fp], capture_output=True)
sys.exit(0)
