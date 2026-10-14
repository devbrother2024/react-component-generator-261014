---
name: create-pr
description: 현재 브랜치의 커밋과 diff를 분석해 한국어 또는 영어 템플릿으로 본문을 채우고 `gh`로 GitHub Pull Request를 생성한다. 사용자가 "PR 만들어줘", "PR 올려줘", "풀리퀘스트 생성", "PR 생성", "create a PR", "open a pull request", "이 브랜치 PR로 올려줘" 등을 말하거나, 작업을 마친 뒤 변경사항을 리뷰에 올리려는 의도가 보이면 명시적으로 스킬 이름을 부르지 않았더라도 반드시 이 스킬을 사용한다.
context: fork
---

# Create PR

현재 브랜치의 변경사항을 분석해 PR 본문을 템플릿에 맞춰 작성하고 `gh pr create`로 PR을 만든다.
사용자가 PR 생성을 요청한 시점에 의도를 밝힌 것이므로 본문을 다시 확인받지 않고 바로 생성한다. 대신 생성 후 URL과 사용한 제목·본문 요약을 투명하게 보고한다. 잘못 만들어졌으면 `gh pr edit`로 고칠 수 있다.

이 스킬은 `context: fork`로 실행된다. 즉 서브 에이전트가 독립된 컨텍스트에서 수행하므로, 대화 이력에 기대지 말고 **git 상태와 diff만으로** 필요한 정보를 모은다. 호출 시 넘겨받은 인자(언어, base 브랜치, 이슈 번호, draft 여부 등)가 있으면 그것을 우선한다.

## 절차

### 1. 사전 점검

```bash
gh auth status                      # 인증 확인. 실패하면 `! gh auth login`을 안내하고 중단
git branch --show-current           # 비어 있으면 detached HEAD
git status --short
git remote -v
gh repo view --json defaultBranchRef -q .defaultBranchRef.name   # base 후보
```

- **detached HEAD**: PR은 브랜치가 있어야 만들 수 있다. 커밋 내용에서 이름을 지어 `git switch -c <type>/<요약-kebab>`로 브랜치를 만든다.
- **base 브랜치에 있는 경우**(현재 브랜치 == base): PR로 올릴 차이가 없다. 브랜치를 새로 따서 올릴지 사용자에게 알리고 중단한다.
- **커밋 안 된 변경이 있으면** 임의로 커밋하지 말고 사용자에게 알린다(커밋은 `commit` 스킬의 몫이다). 사용자가 함께 올려 달라고 했을 때만 진행한다.
- 같은 head 브랜치로 열린 PR이 이미 있는지 확인한다: `gh pr list --head <브랜치> --state open`. 있으면 새로 만들지 않고 그 URL을 알려준다.

### 2. 변경 내용 파악

base는 인자로 받은 값, 없으면 기본 브랜치를 쓴다.

```bash
git fetch origin <base>
git log origin/<base>..HEAD --oneline          # PR에 포함될 커밋
git diff origin/<base>...HEAD --stat           # 변경 파일 규모
git diff origin/<base>...HEAD                  # 실제 변경 (큰 diff는 핵심 파일 위주로)
```

- 본문은 **diff와 커밋에서 확인된 사실만** 쓴다. 추측으로 동기나 효과를 지어내지 않는다. 변경 이유가 코드에서 드러나지 않으면 커밋 본문을 참고하고, 그래도 없으면 "배경" 항목은 비워 두기보다 확인 가능한 범위로만 적는다.
- 테스트·린트를 실제로 돌리지 않았다면 체크리스트를 체크된 상태로 쓰지 않는다. 돌리지 않은 항목은 미체크로 둔다. 거짓 체크는 리뷰어를 오도한다.
- 관련 이슈 번호가 브랜치명·커밋·인자에 있으면 `Closes #N`으로 연결한다. 없으면 이 항목은 생략한다.

### 3. 언어 선택과 템플릿 적용

| 우선순위 | 기준 | 템플릿 |
|---|---|---|
| 1 | 호출 인자/요청에 언어 지정 ("영어로", "in English") | 지정한 언어 |
| 2 | 현재 프로젝트가 `react-component-generator-leader` | `references/pr-template.ko.md` |
| 3 | 그 외 모든 프로젝트 | `references/pr-template.en.md` |

"현재 프로젝트" 판정은 아래 중 하나라도 맞으면 `react-component-generator-leader`로 본다. 이 스킬이 다른 프로젝트로 복사되거나 사용자 레벨로 옮겨져도 올바르게 갈리도록, 스킬 파일 위치가 아니라 **작업 중인 저장소**를 기준으로 한다.

```bash
basename "$(git rev-parse --show-toplevel)"      # react-component-generator-leader
git remote get-url origin                        # .../react-component-generator-* 
```

- 최상위 디렉터리 이름이 `react-component-generator-leader`이거나
- origin URL의 저장소 이름이 `react-component-generator-`로 시작하는 경우 (현재 origin은 `react-component-generator-261014`)

둘 다 아니면 영어 템플릿을 쓴다. 판정이 애매해도 추측하지 말고 3번(영어)으로 처리한다.

선택한 템플릿 파일을 **읽고**, 섹션 구조는 유지한 채 내용을 채운다. 해당 없는 섹션(스크린샷 등)은 "해당 없음"/"N/A"로 두거나 섹션째 제거해도 된다. 템플릿 안의 `<!-- -->` 안내 주석은 최종 본문에 남기지 않는다.

**제목**은 70자 안팎 한 줄로, `feat|fix|refactor|chore|docs|test: 요약` 형식을 쓴다. 제목 언어는 템플릿 언어를 따른다(한국어 템플릿이면 한국어, 영어 템플릿이면 영어). 커밋이 하나뿐이면 그 메시지를 재사용해도 좋다.

### 4. push 및 생성

PR 생성을 요청받은 것은 원격에 브랜치를 올리는 것에 대한 동의를 포함한다. 단 force push는 하지 않는다.

```bash
git push -u origin <브랜치>        # upstream이 없거나 로컬이 앞서 있을 때만
gh pr create --base <base> --head <브랜치> --title "<제목>" --body "$(cat <<'EOF'
<본문>
EOF
)"
```

- `--draft`는 사용자가 요청했을 때만 붙인다.
- 리뷰어·라벨·담당자는 사용자가 지정했을 때만 `--reviewer`, `--label`, `--assignee`로 넣는다.
- 이 세션/환경의 시스템 지침이 PR 본문 끝에 붙이라고 지정한 attribution 줄이 있으면 본문 맨 끝에 포함한다.
- 본문에 백틱·`$`가 많아 쉘 이스케이프가 꼬이면 임시 파일에 쓰고 `--body-file`을 쓴다. 임시 파일은 작업 후 지운다.

### 5. 결과 보고

생성된 PR의 URL, base ← head, 제목, 포함된 커밋 수, 사용한 템플릿 언어를 알린다. 체크리스트에서 검증하지 못해 비워 둔 항목이 있으면 그것도 짚어 준다.

## 하지 말 것
- `--force`/`--force-with-lease` push, base 브랜치 직접 push는 하지 않는다.
- `.env`, 키·토큰 등 민감 정보가 diff에 보이면 PR 본문에 옮기지 말고 사용자에게 먼저 알린다.
- 이미 열린 PR을 중복 생성하지 않는다.
- 사용자 변경사항을 `reset`/`checkout`/`stash`로 건드리지 않는다.
