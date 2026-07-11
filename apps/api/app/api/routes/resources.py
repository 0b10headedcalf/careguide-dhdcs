from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.api.dependencies import request_id
from app.db.session import get_session
from app.schemas.common import success
from app.services.resource_service import get_nearby_resources

router = APIRouter()


@router.get("/resources/nearby")
async def nearby_resources(
    case_id: str | None = None,
    zip: str | None = Query(default=None),
    lat: float | None = None,
    lng: float | None = None,
    language: str | None = "en",
    needs: str | None = None,
    radius_miles: float = 5.0,
    session: Session = Depends(get_session),
    rid: str = Depends(request_id),
):
    data = await get_nearby_resources(
        session,
        case_id=case_id,
        zip_code=zip,
        lat=lat,
        lng=lng,
        language=language,
        needs=needs,
        radius_miles=radius_miles,
    )
    return success(data, rid)

