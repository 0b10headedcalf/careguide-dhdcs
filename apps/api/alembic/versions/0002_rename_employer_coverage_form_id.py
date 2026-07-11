"""rename EMPLOYER_COVERAGE_SECTION to EMPLOYER_COVERAGE_PREVIEW

Revision ID: 0002_rename_employer_coverage_form_id
Revises: 0001_initial
Create Date: 2026-07-11 12:00:00

Reason: the form_catalog dropped EMPLOYER_COVERAGE_SECTION (which pointed at
the generic Covered California forms landing page and was not itself an
official form) in favor of EMPLOYER_COVERAGE_PREVIEW — a clearly-labeled
CareBridge-generated worksheet that mirrors the employer coverage section of
CCFRM604. Any FormRoute row created before this rename would become orphaned
because the form_router would no longer find the old ID in the catalog. This
migration rewrites those rows in place.
"""

from alembic import op


revision = "0002_rename_employer_coverage_form_id"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


OLD_FORM_ID = "EMPLOYER_COVERAGE_SECTION"
NEW_FORM_ID = "EMPLOYER_COVERAGE_PREVIEW"


def upgrade() -> None:
    op.execute(
        f"""
        UPDATE form_routes
        SET form_id = '{NEW_FORM_ID}'
        WHERE form_id = '{OLD_FORM_ID}'
        """
    )
    op.execute(
        f"""
        UPDATE form_field_values
        SET form_id = '{NEW_FORM_ID}'
        WHERE form_id = '{OLD_FORM_ID}'
        """
    )


def downgrade() -> None:
    op.execute(
        f"""
        UPDATE form_routes
        SET form_id = '{OLD_FORM_ID}'
        WHERE form_id = '{NEW_FORM_ID}'
        """
    )
    op.execute(
        f"""
        UPDATE form_field_values
        SET form_id = '{OLD_FORM_ID}'
        WHERE form_id = '{NEW_FORM_ID}'
        """
    )
