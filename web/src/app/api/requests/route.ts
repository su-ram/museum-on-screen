import { NextResponse } from "next/server";

export const runtime = "nodejs";

const REPO = "su-ram/museum-on-screen";
const KINDS: Record<string, string> = {
  museum: "미술관/컬렉션 추가",
  artwork: "작품·이미지 문제 신고",
  feature: "기능 제안",
  other: "기타",
};

// Small in-memory limiter (per machine): 5 requests per IP per hour.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  if (recent.length >= 5) { hits.set(ip, recent); return true; }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

/** Stops user text from pinging GitHub users/teams or issue numbers. */
const neutralize = (s: string) => s.replace(/@/g, "@​");

export async function POST(req: Request) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return NextResponse.json({ error: "요청 접수가 아직 준비되지 않았어요." }, { status: 503 });

  let data: Record<string, unknown>;
  try { data = await req.json(); } catch { return NextResponse.json({ error: "잘못된 요청이에요." }, { status: 400 }); }

  if (typeof data.website === "string" && data.website) return NextResponse.json({ ok: true }); // honeypot: pretend success
  const kind = String(data.kind ?? "");
  const title = String(data.title ?? "").trim();
  const message = String(data.message ?? "").trim();
  if (!KINDS[kind]) return NextResponse.json({ error: "요청 종류를 선택해 주세요." }, { status: 400 });
  if (title.length < 2 || title.length > 100) return NextResponse.json({ error: "제목은 2~100자로 입력해 주세요." }, { status: 400 });
  if (message.length < 5 || message.length > 3000) return NextResponse.json({ error: "내용은 5~3000자로 입력해 주세요." }, { status: 400 });

  const ip = req.headers.get("fly-client-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (limited(ip)) return NextResponse.json({ error: "요청을 너무 많이 보냈어요. 잠시 후 다시 시도해 주세요." }, { status: 429 });

  const res = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "museum-on-screen",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: `[Request] ${neutralize(title)}`,
      body: `**종류:** ${KINDS[kind]}\n\n${neutralize(message)}\n\n---\n_Museum on Screen 소개 페이지의 요청 폼에서 접수됨_`,
    }),
  }).catch(() => null);

  if (!res || !res.ok) {
    console.error("GitHub issue create failed", res?.status, await res?.text().catch(() => ""));
    return NextResponse.json({ error: "요청을 접수하지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
  const issue = (await res.json()) as { html_url: string; number: number };
  return NextResponse.json({ ok: true, url: issue.html_url, number: issue.number });
}
