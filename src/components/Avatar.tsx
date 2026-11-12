/** 아바타 색 (배경, 글자). docs/design.md 1절. */
export const AVATAR_COLORS: readonly (readonly [string, string])[] = [
  ['#2B2870', '#C7C4FF'],
  ['#133A2E', '#A5F3C4'],
  ['#3A2C12', '#F5C77E'],
  ['#232C6B', '#A5B4FC'],
  ['#3D1630', '#F9A8D4'],
  ['#0F3534', '#99F6E4'],
];

/** 아이디 문자열 해시로 색을 고정 배정한다 (대소문자 무시). */
export function avatarColorIndex(id: string, count = AVATAR_COLORS.length): number {
  let hash = 0;
  for (const char of id.toLowerCase()) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  }
  return hash % count;
}

/** 아이디의 영문/숫자 앞 2글자 대문자. 없으면 "?". */
export function avatarInitials(id: string): string {
  return (
    id
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}

type AvatarProps = {
  id: string;
  /** 한 변 px. 기본 28 */
  size?: number;
};

export function Avatar({ id, size = 28 }: AvatarProps) {
  const [background, color] = AVATAR_COLORS[avatarColorIndex(id)] ?? ['#24215A', '#D4D2FA'];
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center font-mono font-bold"
      style={{
        width: size,
        height: size,
        borderRadius: size >= 56 ? 18 : 8,
        background,
        color,
        fontSize: Math.round(size * 0.4),
      }}
    >
      {avatarInitials(id)}
    </span>
  );
}
