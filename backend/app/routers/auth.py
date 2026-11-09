from fastapi import APIRouter
from app.guardrails.rbac import ROLE_PERMISSIONS, UserRole

router = APIRouter(prefix="/api/auth", tags=["Role-Based Access Control (RBAC)"])

@router.get("/roles")
async def get_roles():
    """Returns available roles and their corresponding granular permissions."""
    return {
        role.value: [p.value for p in perms]
        for role, perms in ROLE_PERMISSIONS.items()
    }

