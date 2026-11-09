import ast
from typing import Any
import pandas as pd
import numpy as np

ALLOWED_MODULES = {"math", "datetime", "pandas", "numpy", "json", "scipy"}
BLOCKED_NAMES = {
    "__import__", "eval", "exec", "open", "compile", "breakpoint",
    "globals", "locals", "vars", "dir", "help", "input", "exit", "quit"
}
BLOCKED_ATTRS = {
    "__subclasses__", "__globals__", "__code__", "__builtins__",
    "__class__", "__bases__", "__dict__"
}

class SandboxSecurityError(Exception):
    pass

class SafeCodeValidator(ast.NodeVisitor):
    def __init__(self):
        self.violations: list[str] = []

    def visit_Import(self, node: ast.Import):
        for alias in node.names:
            base_mod = alias.name.split(".")[0]
            if base_mod not in ALLOWED_MODULES:
                self.violations.append(f"Import of unapproved module '{alias.name}' is blocked.")
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom):
        if node.module:
            base_mod = node.module.split(".")[0]
            if base_mod not in ALLOWED_MODULES:
                self.violations.append(f"Import from unapproved module '{node.module}' is blocked.")
        self.generic_visit(node)

    def visit_Name(self, node: ast.Name):
        if node.id in BLOCKED_NAMES:
            self.violations.append(f"Access to blocked builtin function/name '{node.id}' is forbidden.")
        self.generic_visit(node)

    def visit_Attribute(self, node: ast.Attribute):
        if node.attr in BLOCKED_ATTRS:
            self.violations.append(f"Access to sensitive internal attribute '{node.attr}' is forbidden.")
        self.generic_visit(node)

class PythonSandbox:
    @staticmethod
    def validate_code(code: str) -> tuple[bool, list[str]]:
        try:
            tree = ast.parse(code)
        except SyntaxError as e:
            return False, [f"Syntax Error: {str(e)}"]

        validator = SafeCodeValidator()
        validator.visit(tree)
        is_safe = len(validator.violations) == 0
        return is_safe, validator.violations

    @staticmethod
    def execute_safely(code: str, context: dict[str, Any]) -> dict[str, Any]:
        is_safe, violations = PythonSandbox.validate_code(code)
        if not is_safe:
            raise SandboxSecurityError(f"Security Sandbox Rejection: {', '.join(violations)}")

        # Build clean environment
        safe_globals = {
            "__builtins__": {
                "abs": abs,
                "all": all,
                "any": any,
                "bool": bool,
                "dict": dict,
                "float": float,
                "int": int,
                "len": len,
                "list": list,
                "max": max,
                "min": min,
                "round": round,
                "set": set,
                "str": str,
                "sum": sum,
                "tuple": tuple,
                "zip": zip,
                "range": range,
                "enumerate": enumerate,
                "sorted": sorted,
                "isinstance": isinstance,
            },
            "pd": pd,
            "np": np,
        }
        safe_globals.update(context)
        safe_locals: dict[str, Any] = {}

        exec(code, safe_globals, safe_locals)
        return safe_locals
