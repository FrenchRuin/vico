import {
  type FilterState,
  OTHER_TOOL,
  SORT_LABEL,
  SORTS,
  type Sort,
  TAB_LABEL,
  TABS,
  type Tab,
} from '../../lib/filter';

type FilterBarProps = {
  state: FilterState;
  counts: Record<Tab, number>;
  tools: readonly string[];
  onChange: (next: FilterState) => void;
};

/** 보이는 높이 36px, 위아래 투명 여백으로 클릭 영역 44px (design.md 1절). */
const HIT_AREA = "relative before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']";

const CHIP = `${HIT_AREA} inline-flex h-9 items-center whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition-colors`;
const CHIP_ON = 'bg-accent text-white';
const CHIP_OFF = 'border border-border-strong bg-surface text-text-sub hover:bg-muted';

function toolLabel(tool: string): string {
  return tool === OTHER_TOOL ? '기타' : tool;
}

/** 상태 탭, 검색창, 도구 칩, 정렬 칩. */
export function FilterBar({ state, counts, tools, onChange }: FilterBarProps) {
  const set = (patch: Partial<FilterState>) => onChange({ ...state, ...patch });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <fieldset className="flex flex-wrap gap-2 min-w-0">
          <legend className="sr-only">상태</legend>
          {TABS.map((tab: Tab) => {
            const selected = state.tab === tab;
            return (
              <button
                key={tab}
                type="button"
                aria-pressed={selected}
                onClick={() => set({ tab })}
                className={`${HIT_AREA} inline-flex h-10 items-center gap-1.5 rounded-[10px] px-3.5 text-sm font-semibold transition-colors ${
                  selected ? 'bg-text text-bg' : 'text-text-sub hover:bg-muted'
                }`}
              >
                {TAB_LABEL[tab]}
                <span
                  className={`font-mono text-xs ${selected ? 'text-bg/70' : 'text-text-muted'}`}
                >
                  {counts[tab]}
                </span>
              </button>
            );
          })}
        </fieldset>

        <input
          type="search"
          value={state.q}
          onChange={(event) => set({ q: event.target.value })}
          placeholder="제목, 소개 검색"
          aria-label="프로젝트 제목, 소개 검색"
          className="h-11 w-full rounded-[10px] border border-border-strong bg-surface px-3.5 text-sm placeholder:text-text-muted sm:w-64"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <fieldset className="flex flex-wrap gap-2 min-w-0">
          <legend className="sr-only">도구</legend>
          <button
            type="button"
            aria-pressed={state.tool === null}
            onClick={() => set({ tool: null })}
            className={`${CHIP} ${state.tool === null ? CHIP_ON : CHIP_OFF}`}
          >
            전체
          </button>
          {tools.map((tool) => (
            <button
              key={tool}
              type="button"
              aria-pressed={state.tool === tool}
              onClick={() => set({ tool })}
              className={`${CHIP} ${state.tool === tool ? CHIP_ON : CHIP_OFF}`}
            >
              {toolLabel(tool)}
            </button>
          ))}
        </fieldset>

        <fieldset className="flex flex-wrap gap-2 min-w-0">
          <legend className="sr-only">정렬</legend>
          {SORTS.map((sort: Sort) => (
            <button
              key={sort}
              type="button"
              aria-pressed={state.sort === sort}
              onClick={() => set({ sort })}
              className={`${CHIP} ${state.sort === sort ? CHIP_ON : CHIP_OFF}`}
            >
              {SORT_LABEL[sort]}
            </button>
          ))}
        </fieldset>
      </div>
    </div>
  );
}
