import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

export async function GET(req: Request): Promise<Response> {
  const dm = await draftMode()
  dm.disable()
  const { searchParams } = new URL(req.url)
  redirect(searchParams.get('redirect') || '/')
}
