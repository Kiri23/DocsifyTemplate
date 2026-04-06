"""
AST-based Flask endpoint extractor.

Extracts route definitions, URL params, query params, and body params
directly from Python source code — zero LLM, 100% deterministic.

Usage:
    python ast_extractor.py sample_api.py
    python ast_extractor.py sample_api.py --markdown
"""

import ast
import json
import sys
import re


def extract_endpoints(filepath: str) -> list[dict]:
    """Parse a Flask file and extract all route endpoints via AST."""
    with open(filepath) as f:
        source = f.read()

    tree = ast.parse(source, filename=filepath)
    endpoints = []

    for node in ast.walk(tree):
        if not isinstance(node, ast.FunctionDef):
            continue

        route_info = _extract_route_decorator(node)
        if not route_info:
            continue

        path, methods = route_info

        # URL params from path like <int:user_id>
        url_params = _extract_url_params(path, node)

        # Params from request.args.get() and request.get_json()
        query_params = []
        body_params = []

        # Step 1: find which variable holds request.get_json()
        json_vars = _find_json_vars(node)

        for child in ast.walk(node):
            qp = _extract_query_param(child, source)
            if qp:
                query_params.append(qp)

            bp = _extract_body_param(child, source, json_vars)
            if bp:
                body_params.append(bp)

        # Docstring
        docstring = ast.get_docstring(node) or ''

        for method in methods:
            params = []
            if method in ('GET', 'DELETE'):
                params = url_params + query_params
            else:
                params = url_params + body_params

            endpoints.append({
                'method': method,
                'path': path,
                'function': node.name,
                'description': docstring,
                'source_file': filepath,
                'source_line': node.lineno,
                'params': params,
            })

    return endpoints


def _extract_route_decorator(node: ast.FunctionDef):
    """Extract @app.route('/path', methods=['GET']) from decorators."""
    for dec in node.decorator_list:
        if not isinstance(dec, ast.Call):
            continue

        # Match app.route(...) or blueprint.route(...)
        func = dec.func
        if isinstance(func, ast.Attribute) and func.attr == 'route':
            path = None
            methods = ['GET']

            # First arg is the path
            if dec.args and isinstance(dec.args[0], ast.Constant):
                path = dec.args[0].value

            # methods keyword
            for kw in dec.keywords:
                if kw.arg == 'methods' and isinstance(kw.value, ast.List):
                    methods = [
                        elt.value for elt in kw.value.elts
                        if isinstance(elt, ast.Constant)
                    ]

            if path:
                return path, methods

    return None


def _extract_url_params(path: str, func_node: ast.FunctionDef) -> list[dict]:
    """Extract <type:name> params from the URL path."""
    params = []
    for match in re.finditer(r'<(?:(\w+):)?(\w+)>', path):
        type_str = match.group(1) or 'string'
        name = match.group(2)

        # Map Flask URL converters to JSON-friendly types
        type_map = {'int': 'integer', 'float': 'number', 'string': 'string', 'path': 'string'}

        params.append({
            'name': name,
            'type': type_map.get(type_str, type_str),
            'required': True,
            'location': 'path',
            'origin': 'ast',
        })
    return params


def _extract_query_param(node, source: str) -> dict | None:
    """Detect request.args.get('name', default, type=int) patterns."""
    if not isinstance(node, ast.Call):
        return None

    func = node.func
    if not (isinstance(func, ast.Attribute)
            and func.attr == 'get'
            and isinstance(func.value, ast.Attribute)
            and func.value.attr == 'args'):
        return None

    if not node.args or not isinstance(node.args[0], ast.Constant):
        return None

    name = node.args[0].value
    param = {
        'name': name,
        'type': 'string',
        'required': False,
        'location': 'query',
        'origin': 'ast',
    }

    # Check for type= keyword (e.g., type=int)
    for kw in node.keywords:
        if kw.arg == 'type' and isinstance(kw.value, ast.Name):
            type_map = {'int': 'integer', 'float': 'number', 'str': 'string', 'bool': 'boolean'}
            param['type'] = type_map.get(kw.value.id, kw.value.id)

    # If there's a non-None default, it's optional. If no default, might be required.
    if len(node.args) >= 2:
        param['required'] = False

    return param


def _find_json_vars(func_node: ast.FunctionDef) -> set[str]:
    """
    Find variable names assigned from request.get_json() or request.json.

    Detects:
        data = request.get_json()
        body = request.json
    """
    json_vars = set()
    for node in ast.walk(func_node):
        if not isinstance(node, ast.Assign):
            continue
        # request.get_json()
        if (isinstance(node.value, ast.Call)
                and isinstance(node.value.func, ast.Attribute)
                and node.value.func.attr == 'get_json'
                and isinstance(node.value.func.value, ast.Name)
                and node.value.func.value.id == 'request'):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    json_vars.add(target.id)
        # request.json (property, not a call)
        if (isinstance(node.value, ast.Attribute)
                and node.value.attr == 'json'
                and isinstance(node.value.value, ast.Name)
                and node.value.value.id == 'request'):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    json_vars.add(target.id)
    return json_vars


def _extract_body_param(node, source: str, json_vars: set[str]) -> dict | None:
    """
    Detect data['key'] (required) and data.get('key') (optional) patterns,
    but ONLY if the variable comes from request.get_json() / request.json.
    """
    # Match: data['key'] → Subscript (required)
    if isinstance(node, ast.Subscript):
        if (isinstance(node.value, ast.Name)
                and node.value.id in json_vars
                and isinstance(node.slice, ast.Constant)
                and isinstance(node.slice.value, str)):
            return {
                'name': node.slice.value,
                'type': 'string',
                'required': True,
                'location': 'body',
                'origin': 'ast',
            }

    # Match: data.get('key', default) → optional body param
    if isinstance(node, ast.Call):
        func = node.func
        if (isinstance(func, ast.Attribute)
                and func.attr == 'get'
                and isinstance(func.value, ast.Name)
                and func.value.id in json_vars
                and node.args
                and isinstance(node.args[0], ast.Constant)
                and isinstance(node.args[0].value, str)):

            param = {
                'name': node.args[0].value,
                'type': 'string',
                'required': False,
                'location': 'body',
                'origin': 'ast',
            }

            # Infer type from default value
            if len(node.args) >= 2:
                default = node.args[1]
                if isinstance(default, ast.Constant):
                    if isinstance(default.value, bool):
                        param['type'] = 'boolean'
                    elif isinstance(default.value, int):
                        param['type'] = 'integer'
                    elif isinstance(default.value, float):
                        param['type'] = 'number'
                elif isinstance(default, ast.List):
                    param['type'] = 'array'

            return param

    return None


def to_docsify_markdown(endpoints: list[dict]) -> str:
    """Convert extracted endpoints to DocsifyTemplate api-endpoint blocks."""
    blocks = []
    for ep in endpoints:
        lines = [
            f"method: {ep['method']}",
            f"path: {ep['path']}",
        ]
        if ep['description']:
            lines.append(f"description: {ep['description']}")

        if ep['params']:
            lines.append("params:")
            for p in ep['params']:
                lines.append(f"  - name: {p['name']}")
                lines.append(f"    type: {p['type']}")
                lines.append(f"    required: {str(p['required']).lower()}")

        block = "```api-endpoint\n" + "\n".join(lines) + "\n```"
        blocks.append(block)

    return "\n\n".join(blocks)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python ast_extractor.py <flask_file.py> [--markdown]")
        sys.exit(1)

    filepath = sys.argv[1]
    markdown_mode = '--markdown' in sys.argv

    endpoints = extract_endpoints(filepath)

    if markdown_mode:
        print(to_docsify_markdown(endpoints))
    else:
        print(json.dumps(endpoints, indent=2))
