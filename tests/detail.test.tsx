import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ProjectView } from '../lib/data';
import {
  ChecklistSection,
  NextTaskStrip,
  ProjectSummary,
  RecruitBanner,
} from '../src/components/ProjectDetail';
import { makeProject, NOW } from './fixtures';

function view(overrides: Partial<ProjectView> = {}): ProjectView {
  return { ...makeProject(overrides), status: 'active', ...overrides };
}

const html = (node: React.ReactElement) => renderToStaticMarkup(node);

describe('ProjectSummary', () => {
  it('상태 + 업데이트 시각, 레포 링크, 프로필 링크', () => {
    const out = html(<ProjectSummary project={view()} now={NOW} />);
    expect(out).toContain('활발 · 오늘 업데이트');
    expect(out).toContain('href="https://github.com/minji/app"');
    expect(out).toContain('href="/u/minji"');
  });

  it('demo가 있을 때만 "데모 열기"', () => {
    expect(html(<ProjectSummary project={view()} now={NOW} />)).not.toContain('데모 열기');
    expect(
      html(<ProjectSummary project={view({ demo: 'https://demo.example.com' })} now={NOW} />),
    ).toContain('데모 열기');
  });

  it('language가 없으면 생략한다', () => {
    expect(html(<ProjectSummary project={view({ language: null })} now={NOW} />)).not.toContain(
      'TypeScript',
    );
  });
});

describe('NextTaskStrip', () => {
  it('완료 프로젝트(다음 할 일 없음)는 숨긴다', () => {
    expect(html(<NextTaskStrip nextTask={null} />)).toBe('');
    expect(html(<NextTaskStrip nextTask="로그인" />)).toContain('로그인');
  });
});

describe('ChecklistSection', () => {
  it('단계 이름이 없으면 이름 없이 항목만', () => {
    const out = html(<ChecklistSection project={view()} />);
    expect(out).not.toContain('<h3');
    expect(out).toContain('1/2');
    expect(out).toContain('완료: </span>a');
  });

  it('단계 이름과 단계별 개수', () => {
    const project = view({
      stages: [
        { name: '기획', items: [{ text: 'x', done: true }] },
        {
          name: '개발',
          items: [
            { text: 'y', done: false },
            { text: 'z', done: false },
          ],
        },
      ],
    });
    const out = html(<ChecklistSection project={project} />);
    expect(out).toContain('>기획</h3>');
    expect(out).toContain('0/2');
  });

  it('체크리스트가 비어 있으면 안내 문구', () => {
    expect(html(<ChecklistSection project={view({ stages: [] })} />)).toContain(
      '체크리스트가 비어 있어요',
    );
  });
});

describe('RecruitBanner', () => {
  const recruiting = view({
    recruiting: true,
    lookingFor: ['디자이너'],
    contact: 'https://open.kakao.com/o/abc',
  });

  it('모집하지 않거나 휴면이면 숨긴다', () => {
    expect(html(<RecruitBanner project={view()} discordUrl="" />)).toBe('');
    expect(
      html(<RecruitBanner project={{ ...recruiting, status: 'dormant' }} discordUrl="" />),
    ).toBe('');
  });

  it('포지션, 링크형 연락처, 디스코드 버튼(설정했을 때만)', () => {
    const out = html(<RecruitBanner project={recruiting} discordUrl="https://discord.gg/x" />);
    expect(out).toContain('디자이너');
    expect(out).toContain('href="https://open.kakao.com/o/abc"');
    expect(out).toContain('#팀원모집에서 이야기하기');
    expect(html(<RecruitBanner project={recruiting} discordUrl="" />)).not.toContain('#팀원모집');
  });

  it('링크가 아닌 연락처는 글자로', () => {
    const out = html(
      <RecruitBanner project={{ ...recruiting, contact: 'discord: minji_dev' }} discordUrl="" />,
    );
    expect(out).toContain('discord: minji_dev');
    expect(out).not.toContain('href="discord');
  });
});
