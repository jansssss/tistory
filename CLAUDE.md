# 프로젝트 컨텍스트

GitHub Actions로 티스토리 블로그에 매일 자동 글 발행하는 프로젝트.
매일 09~10시 사이 랜덤 발행, OpenAI로 글 생성 후 Playwright로 티스토리에 업로드.

## 주요 설정

- GitHub Secret: `TISTORY_AUTH_JSON` (base64 인코딩), `OPENAI_API_KEY`, `TISTORY_BLOG_URL`
- 모델: `gpt-5.4-mini` (GitHub Variables `OPENAI_MODEL` 또는 워크플로우 기본값)
- 토픽 파일: `data/tistory_300.csv` (컬럼: 번호, 키워드, status)
- auth.json 복원 방식: `python3 -c "import base64,os; open('auth.json','wb').write(base64.b64decode(os.environ['TISTORY_AUTH_JSON']))"`

## 티스토리 에디터 발행 흐름

1. `/manage/newpost` 접속
2. 제목 입력 (`.textarea_tit`)
3. 본문 삽입 (TinyMCE iframe `[contenteditable="true"]`)
4. **완료** 버튼 클릭 → 발행 패널 열림
5. **공개 발행** 버튼 클릭

## 해결된 이슈

- `data/topics.csv` → `data/tistory_300.csv` 파일명 (config.js 기준)
- `max_output_tokens` 8000 → 16000 (JSON 잘림 방지)
- auth.json GitHub Secret은 base64로 인코딩해서 저장, python3으로 디코딩

## 남은 이슈

- **발행 실제 확인 필요**: 코드상 성공 로그는 나오지만 실제 글 발행됐는지 미확인
- **OpenAI `reasoning` 파라미터**: `article-generator.js` 249번째 줄, `gpt-5.4-mini`에서 지원 여부 불확실 — HTTP 500 유발 가능성 있음
- **auth.json 만료**: TSID 등 세션 쿠키 만료 주기 짧음 → 주기적으로 `node scripts/save-auth.js` 재실행 후 base64 재인코딩하여 Secret 업데이트 필요
