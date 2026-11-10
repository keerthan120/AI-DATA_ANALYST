import uuid
import json
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, text
from sqlalchemy.orm import relationship
from app.db.session import Base, engine

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    phone_number = Column(String(50), nullable=True)
    company = Column(String(100), nullable=True, default="Digital Back Office")
    role = Column(String(100), nullable=True, default="Data Analyst")
    is_2fa_enabled = Column(Integer, nullable=True, default=0) # 0 = disabled, 1 = enabled
    two_factor_code = Column(String(10), nullable=True)
    two_factor_expires = Column(DateTime, nullable=True)
    reset_token = Column(String(255), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String(255), nullable=False, default="New Analysis")
    user_id = Column(Integer, nullable=True, index=True)
    active_tables = Column(Text, nullable=True, default="[]")  # JSON list of table names
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    messages = relationship(
        "ChatMessageModel",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="ChatMessageModel.created_at"
    )

    def get_tables_list(self) -> list[str]:
        if not self.active_tables:
            return []
        try:
            return json.loads(self.active_tables)
        except Exception:
            return []

    def set_tables_list(self, tables: list[str]) -> None:
        self.active_tables = json.dumps(tables)

class ChatMessageModel(Base):
    __tablename__ = "chat_messages"

    id = Column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String(64), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # "user", "assistant", "system"
    content = Column(Text, nullable=False)
    response_payload = Column(Text, nullable=True)  # JSON-encoded string containing chart, SQL, Python, anomalies, reasoning
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")

# Safe automatic migration check
def ensure_db_schema():
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        for stmt in [
            "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS active_tables TEXT;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS company VARCHAR(100);",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(100);",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_2fa_enabled INTEGER DEFAULT 0;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_code VARCHAR(10);",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_expires TIMESTAMP;"
        ]:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                pass
