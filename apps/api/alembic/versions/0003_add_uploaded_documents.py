"""add uploaded documents

Revision ID: 0003_add_uploaded_documents
Revises: 0002_rename_employer_coverage_form_id
"""

import sqlalchemy as sa
from alembic import op


revision = "0003_add_uploaded_documents"
down_revision = "0002_rename_employer_coverage_form_id"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "uploaded_documents",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("case_id", sa.String(), nullable=False),
        sa.Column("filename", sa.String(), nullable=False),
        sa.Column("document_type", sa.String(), nullable=True),
        sa.Column("mime_type", sa.String(), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.String(), nullable=False),
        sa.Column("storage_path", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("extraction_status", sa.String(), nullable=False),
        sa.Column("extracted_text", sa.Text(), nullable=True),
        sa.Column("needs_confirmation", sa.Boolean(), nullable=False),
        sa.Column("confirmed_by_user", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_uploaded_documents_id", "uploaded_documents", ["id"])
    op.create_index("ix_uploaded_documents_case_id", "uploaded_documents", ["case_id"])
    op.create_index("ix_uploaded_documents_sha256", "uploaded_documents", ["sha256"])


def downgrade() -> None:
    op.drop_index("ix_uploaded_documents_sha256", table_name="uploaded_documents")
    op.drop_index("ix_uploaded_documents_case_id", table_name="uploaded_documents")
    op.drop_index("ix_uploaded_documents_id", table_name="uploaded_documents")
    op.drop_table("uploaded_documents")
