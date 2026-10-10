# Design lint (공통 룩앤필 가드)

셸(`src/**`)이 공통 디자인 토큰과 공통 컴포넌트를 벗어나지 않도록 빌드 전에 검사한다.

- 도구: [`@shadcn/lint`](https://github.com/shadcn-ui/lint) (shadcn 공식, MIT, ESLint 9.30+ 플러그인)
- 설정: `eslint.design.config.mjs` (`eslint.config.mjs` 에도 포함되어 `npm run lint` 로 함께 실행)
- 실행: `npm run lint:design` — `prebuild` 로 연결되어 `npm run build`(Vercel 빌드 포함) 전에 자동 실행되고, 위반이 있으면 빌드가 실패한다.

## 테마 토큰 (`src/app/globals.css`)

| 용도 | 토큰 (Tailwind 클래스) |
| --- | --- |
| 브랜드 기본(네이비 #1E3A8A) | `primary`, `primary-foreground`, `ring` |
| 강조(코랄 #F97316) — **강조/포인트에만** | `accent`, `accent-foreground` |
| 바탕/표면 | `background`, `surface`, `card`, `popover` |
| 텍스트 | `foreground`, `muted-foreground` |
| 중립 면 | `muted`, `secondary` |
| 선 | `border`, `input` |
| 위험/오류 | `destructive` |
| 상태 | `success`, `success-muted`, `info`, `info-muted`, `warning` |
| 레거시 중립 텍스트 | `stone-400`, `stone-600`, `stone-700`, `stone-800` |

- 폰트: Pretendard (`--font-sans`, `--font-heading`)
- `stone-*`: 셸은 원래 stone 팔레트를 slate 값으로 재정의해 썼다. 시맨틱 토큰과 값이 같은 단계는 마이그레이션 완료
  (`stone-50`→`background`, `stone-100`→`muted`, `stone-200`→`border`, `stone-300`→`input`, `stone-500`→`muted-foreground`, `stone-900`→`foreground`)
  하고 테마에서 제거했다. 대응 시맨틱 토큰이 없는 중간 텍스트 단계(400/600/700/800)만 레거시 토큰으로 남아 있다.
  제거된 단계를 다시 쓰면 Tailwind 기본(따뜻한 회색) stone 이 되므로 린트가 raw palette 로 잡는다.
- `white`/`black`/`transparent`/`current`/`inherit` 는 `@shadcn/lint` 가 기본 허용한다. 셸 화면에서는 `bg-white` 대신 `bg-surface`/`bg-card`,
  `text-white` 대신 `text-primary-foreground` 를 쓴다(다크 모드 대응). 인쇄 전용 화면(`worship/[id]/print`)의 `bg-white` 는 종이색이므로 유지.
- 새 색이 필요하면 call site 에서 팔레트를 쓰지 말고 `globals.css` 에 시맨틱 토큰(`--x`, `--color-x: var(--x)`)을 추가한다.

## 규칙

### (a) 테마 토큰 외 색상 금지

| 규칙 | 잡는 것 |
| --- | --- |
| `shadcn/no-raw-colors` (`scanAllStrings`) | `bg-red-500`, `text-slate-500`, `border-gray-200` 등 Tailwind 팔레트 색, 선언되지 않은 색 토큰. 클래스 맵 상수 문자열까지 검사 |
| `shadcn/no-arbitrary-values` (색만) | `bg-[#123456]`, `text-[rgb(...)]` 등 임의 색상값. 색 외 임의값(`w-[42%]` 등)은 허용 |
| `shadcn/no-inline-styles` (색 속성만) | `style={{ color: "#f00" }}`, `backgroundColor`, `borderColor`, `fill`, `boxShadow` 등. 레이아웃용 동적 값(`fontSize`, `width`)은 허용 |

### (b) 공통 컴포넌트 call-site 재스타일 금지

`shadcn/no-restyle` — `@/components/ui`(호환 브리지 `src/components/ui.tsx`)와 `@/components/ui/*` 에서 가져온 컴포넌트의 `className` 은
**allowlist: `layout` 카테고리만** 허용한다.

- 허용(layout): margin(`mt-4`), width/max-width(`w-full`, `max-w-md`), `h-full`, flex/grid 배치(`flex-1`, `shrink-0`, `col-span-*`, `self-*`, `order-*`),
  display/반응형(`hidden`, `lg:flex`), position(`sticky`, `top-8`), `overflow-hidden`, 정렬 등
- 금지: 색(bg/text/border 색), 테두리·radius·ring, 그림자·opacity, 타이포(text-size/font-weight/truncate), padding·gap, motion(transition)

외형을 바꿔야 하면 컴포넌트에 variant/prop 을 추가한다. 현재 제공:

| 컴포넌트 | prop |
| --- | --- |
| `Card` (bridge) | `padding="none|md|lg|xl"`, `tone="default|muted|success|empty"`, `interactive`, `bleed` |
| `Button` (bridge) | `variant="primary|secondary|ghost|danger"`, `size="default|sm"` |
| `Badge` (bridge) | `tone="neutral|green|blue|accent"`, `shape="pill|tag"` |
| `Notice` (bridge) | `tone="destructive|success"` — 폼 오류/처리 결과 박스 |
| `Button` (ui/button) | `variant` 에 `ghost-muted` 추가 |
| `SheetContent` / `DialogContent` | `flush` (기본 gap/padding 제거) |
| `SheetHeader` / `DialogHeader` | `variant="bar"` (하단 경계선 있는 가로 헤더 바) |
| `DialogTitle` | `size="sm"` |

## 제외 범위

- `src/components/ui/**`, `src/components/ui.tsx`: 공통 컴포넌트 구현부. 스스로를 스타일링하는 곳이므로 `no-restyle`·`no-arbitrary-values` 제외
  (shadcn 생성 코드의 `ring-[3px]`, `rounded-[min(...)]` 등). 팔레트 색 검사(`no-raw-colors`)·인라인 색 검사는 여기서도 유지.
- `public/**` (특히 `public/sorting-hat/**`): 별도로 임베드되는 레거시 정적 앱(HTML/JS). Tailwind·셸 테마를 쓰지 않으므로 대상 아님.

## 의도적 예외

정말 필요한 경우에만, 해당 줄 바로 위에 사유와 함께 표시한다:

```tsx
// eslint-disable-next-line shadcn/no-restyle -- design-lint-allow: <사유>
```

현재 예외: 없음.
