/** 아바타 색 (배경, 글자). docs/design.md 1절. */
export const AVATAR_COLORS: readonly (readonly [string, string])[] = [
  ['#EEEDFE', '#3B35C9'],
  ['#E3F3E7', '#14632B'],
  ['#FCEFD6', '#7A4A00'],
  ['#E4EBFE', '#23389E'],
  ['#FDE7EF', '#9D174D'],
  ['#E0F2F1', '#115E59'],
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
  const [background, color] = AVATAR_COLORS[avatarColorIndex(id)] ?? ['#F3F4F6', '#374151'];
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
