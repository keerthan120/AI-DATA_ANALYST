from enum import Enum
from typing import Optional
from fastapi import Header, HTTPException, status
from app.models.schemas import UserRole

class Permission(str, Enum):
    QUERY_DATA = "query_data"
    VIEW_SQL = "view_sql"
    EXECUTE_CUSTOM_CODE = "execute_custom_code"
    UPLOAD_DATA = "upload_data"
    ANOMALY_DETECTION = "anomaly_detection"
    EXPORT_REPORT = "export_report"
    SYSTEM_CONFIG = "system_config"

ROLE_PERMISSIONS: dict[UserRole, set[Permission]] = {
    UserRole.ADMIN: {
        Permission.QUERY_DATA,
        Permission.VIEW_SQL,
        Permission.EXECUTE_CUSTOM_CODE,
        Permission.UPLOAD_DATA,
        Permission.ANOMALY_DETECTION,
        Permission.EXPORT_REPORT,
        Permission.SYSTEM_CONFIG,
    },
    UserRole.ANALYST: {
        Permission.QUERY_DATA,
        Permission.VIEW_SQL,
        Permission.UPLOAD_DATA,
        Permission.ANOMALY_DETECTION,
        Permission.EXPORT_REPORT,
    },
    UserRole.VIEWER: {
        Permission.QUERY_DATA,
        Permission.EXPORT_REPORT,
    },
}

class RBACManager:
    @staticmethod
    def check_permission(role: UserRole, required_permission: Permission) -> bool:
        allowed = ROLE_PERMISSIONS.get(role, set())
        return required_permission in allowed

    @staticmethod
    def enforce(role: UserRole, required_permission: Permission):
        if not RBACManager.check_permission(role, required_permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: Role '{role.value}' does not have permission '{required_permission.value}'."
            )

def get_current_role(x_user_role: Optional[str] = Header(default="Admin")) -> UserRole:
    """Extract and validate the user role from request headers."""
    try:
        return UserRole(x_user_role)
    except ValueError:
        return UserRole.VIEWER
