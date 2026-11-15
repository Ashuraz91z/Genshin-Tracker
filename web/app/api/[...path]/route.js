import { getApi } from '../../../lib/api.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export function GET(request){return getApi().handle(request);}
export function POST(request){return getApi().handle(request);}
export function DELETE(request){return getApi().handle(request);}
