#!/usr/bin/env python3
"""Parse an Odoo __manifest__.py from stdin and output selected fields as JSON."""

import ast
import json
import sys

FIELDS = ("name", "depends", "summary", "version", "author", "license", "category")


def main():
    source = sys.stdin.read()
    try:
        data = ast.literal_eval(source)
    except (ValueError, SyntaxError) as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

    if not isinstance(data, dict):
        print(json.dumps({"error": "manifest is not a dict"}))
        sys.exit(1)

    result = {}
    for field in FIELDS:
        value = data.get(field, "")
        if field == "depends":
            if isinstance(value, str):
                value = [value] if value else []
            elif not isinstance(value, (list, tuple)):
                value = []
        result[field] = value if value is not None else ""

    json.dump(result, sys.stdout)


if __name__ == "__main__":
    main()
