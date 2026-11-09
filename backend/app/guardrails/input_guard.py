import re
from typing import Tuple

DESTRUCTIVE_SQL_KEYWORDS = [
    r"\bDROP\b",
    r"\bDELETE\b",
    r"\bTRUNCATE\b",
    r"\bALTER\b",
    r"\bUPDATE\b",
    r"\bINSERT\b",
    r"\bGRANT\b",
    r"\bREVOKE\b",
    r"\bEXEC\b",
    r"\bEXECUTE\b",
    r"\bSHUTDOWN\b",
    r"\bATTACH\b",
    r"\bDETACH\b",
    r"\bCREATE\s+(TABLE|VIEW|SCHEMA|DATABASE|FUNCTION)\b",
]

PROMPT_INJECTION_PATTERNS = [
    r"ignore (all )?previous instructions",
    r"system prompt reveal",
    r"you are now an unrestricted",
    r"disregard safety guidelines",
    r"drop all security constraints",
    r"sudo mode",
    r"bypass guardrails",
    r"reveal (the )?system prompt",
]

PATH_TRAVERSAL_PATTERNS = [
    r"\.\.[\\/]",
    r"[\\/]etc[\\/]",
    r"[a-zA-Z]:[\\/]Windows",
    r"~[\\/]",
]

class GuardrailViolation(Exception):
    def __init__(self, message: str, rule: str):
        super().__init__(message)
        self.rule = rule

class InputGuardrail:
    @staticmethod
    def validate_user_query(query: str) -> Tuple[bool, list[str]]:
        """
        Scans incoming natural language queries for injection attempts.
        Returns (is_safe, violations).
        """
        violations = []
        
        # Check prompt injection
        for pattern in PROMPT_INJECTION_PATTERNS:
            if re.search(pattern, query, re.IGNORECASE):
                violations.append(f"Potential prompt injection detected matching rule: '{pattern}'")
                
        # Check path traversal
        for pattern in PATH_TRAVERSAL_PATTERNS:
            if re.search(pattern, query, re.IGNORECASE):
                violations.append(f"Directory traversal pattern detected matching: '{pattern}'")

        # Check raw destructive SQL keywords in input query
        for pattern in DESTRUCTIVE_SQL_KEYWORDS:
            if re.search(pattern, query, re.IGNORECASE):
                violations.append(f"Destructive SQL operation detected and blocked: '{pattern}'")

        is_safe = len(violations) == 0
        return is_safe, violations

    @staticmethod
    def validate_sql(sql: str) -> Tuple[bool, list[str]]:
        """
        Ensures that generated SQL contains strictly READ-ONLY statements (SELECT / WITH).
        Rejects any write or destructive statements.
        """
        violations = []
        cleaned_sql = re.sub(r"--.*", "", sql) # Remove single line comments
        cleaned_sql = re.sub(r"/\*.*?\*/", "", cleaned_sql, flags=re.DOTALL) # Remove multiline comments
        cleaned_sql = cleaned_sql.strip()
        
        # Must start with SELECT or WITH
        if not re.match(r"^\s*(SELECT|WITH|DESCRIBE|EXPLAIN|PRAGMA)\b", cleaned_sql, re.IGNORECASE):
            violations.append("SQL must be a read-only query beginning with SELECT, WITH, or DESCRIBE.")
            
        # Check for destructive keywords
        for pattern in DESTRUCTIVE_SQL_KEYWORDS:
            if re.search(pattern, cleaned_sql, re.IGNORECASE):
                violations.append(f"Destructive SQL keyword violation: '{pattern}'")
                
        is_safe = len(violations) == 0
        return is_safe, violations

