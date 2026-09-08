# Фаза 2 · Аннотированная библиография: bb vs deepseek-harness (dsh)

- Статус: деливерабл фазы 2 (Investigation), роль bibliography_agent.
- Дата среза: 2026-09-03. Версии: bb CLI `0.41.0` (BB-1); dsh — master-коммит `d6d62f6dce085c7f52630811121c056b4351102f` от 2026-09-01 (DSH-0).
- Границы фазы: только аннотированный список источников и сводка фактов по осям. Вердиктов, оценок осей по рубрике и рекомендаций здесь нет — это владение фаз синтеза и финального брифа.

## Search Strategy

**Базы**: (1) живой продукт bb — CLI локальной установки (демон `http://127.0.0.1:38886`), команды `bb --version`, `bb guide <chapter>` по 10 главам, `bb plugin list`, `bb skill list`, `bb skill show` справочника авторинга плагинов; (2) локальный репозиторий dsh — `docs/`, `packages/client/*`, `packages/extensions/*`, `apps/web`, `scripts/`; (3) публичный веб — только вторичная корроборация.

**Ключевые слова/наводки**: non-chat surfaces, pages, dashboard, sidebar, panel, slots, plugin SDK, settings, automations, schedule, terminals, providers, connect/share, workspace, session/thread.

**Критерии включения**: первичный артефакт первой стороны (вывод CLI установленного продукта; файл репозитория с точными строками), относящийся хотя бы к одной из восьми осей, проверен в этой сессии. **Критерии исключения**: маршруты/фичи, не подтверждённые локальным срезом (роадмапы, блог-посты о будущем), публичные пересказы без проверки (R5 соблюдён: ничего из обещанного не учтено).

**Дата поиска**: 2026-09-03. Всего команд CLI: 14; файлов репозитория прочитано: ~30.

**Ограничения поиска**: оба веб-интерфейса не запускались визуально — факты о UI взяты из первичных текстов самих продуктов (справочник `bb guide` и код/доки dsh), а не со скриншотов; отрицательные утверждения («страницы X нет») опираются на полнотекстовый поиск по `docs/` и на исчерпывающий сгенерированный каталог слотов dsh, что сильнее обычного отсутствия в доках, но не заменяет запуск. MCP в `bb guide` не упоминается — зафиксировано как пробел, а не как отсутствие поддержки.

---

## Аннотированные источники

### Группа A. bb — живой CLI и собственная документация продукта (первичные)

**[BB-1] `bb --version`**
- Локатор: вывод команды: `0.41.0`.
- Факты: зафиксированная версия среза bb.
- Оценка: A (первичный, запуск продукта).

**[BB-2] `bb guide` (обзорная глава)**
- Локатор: вывод команды; ключевой фрагмент: «bb is an agent orchestration tool for managing multiple agents. … Project — maps to a repository. All threads belong to a project. … Thread — a single agent conversation. … Environment — where a thread runs. Kinds: project checkout or isolated worktree. … Machine — an execution host … Terminal — a persistent PTY session scoped to a thread, environment, or machine path. … Provider — the agent backend powering a thread (e.g., codex, claude-code)»; далее список глав: `threads|environments|agent-configuration|providers|projects|machines|terminals|customization|plugins|automations`.
- Факты: модель сущностей bb — проект → треды; окружения (checkout/worktree); машины; терминалы; провайдеры; треды имеют parent-child (родитель получает уведомления жизненного цикла).
- Оценка: A.

**[BB-3] `bb guide threads`** (сохранён в `$TMPDIR/bb-evidence/guide-threads.txt`; далее строки по этому файлу)
- Локатор: `bb guide threads`, строки 100–136 (`bb thread list --project/--archived/--section/--include-hidden`, `bb thread search`, `bb thread count --by host|provider|project`), 131–136 (секции тредов: `bb thread section list/create/rename/delete`), 173–191 (`bb thread open <thread-id> [path] --line --split right|down|left|top|replace`, `bb thread pane maximize|restore|toggle|spotlight`, «Pane actions broadcast to connected BB app windows», лимит «through the eighth pane»), 279–302 (очередь сообщений с причинами ожидания), 304–307 (persisted panel tabs: `bb thread tabs show/set`), 328–339 (archive/unarchive).
- Факты: треды фильтруются по проекту/секции/архиву; поиск по тредам и сообщениям (`bb thread search`); счётчики по машине/провайдеру/проекту считаются в БД; UI имеет панели-«пейны» (до 8), сплиты, спотлайт, сохраняемые вкладки панели треда; заголовок треда = title → первый промпт (стр. 108–111).
- Оценка: A.

**[BB-4] `bb guide projects`**
- Локатор: строки 5–10 (`bb project list --include-personal`, `bb project history`, `bb project reorder <id> --after/--before` — «Reorder in the sidebar»), 62–79 (несколько machine-local источников проекта: `bb project source add --path/--clone/--machine/--default`).
- Факты: проекты — репозитории; порядок проектов в сайдбаре управляем; у проекта может быть несколько источников на разных машинах; вложения проекта (upload/download, лимиты 10/25 МБ, стр. 44–58).
- Оценка: A.

**[BB-5] `bb guide machines`**
- Локатор: строки 3–5 («A machine is a host daemon… Add remote machines under Settings → Machines»), 38–46 (лимит разрешений машины: «Set it in Settings → Machines → the machine → Permission limit; that page also shows the machine's projects, provider CLIs, update state, and rename/remove»), 50–52 («One consolidated view of bb and provider CLI updates across machines — the CLI counterpart of Settings → Updates and the sidebar Updates badge»).
- Факты: в UI есть отдельные страницы Settings → Machines (с карточкой машины: проекты, провайдерные CLI, состояние обновлений, переименование/удаление, лимит разрешений) и Settings → Updates, плюс бейдж Updates в сайдбаре; `bb updates` — CLI-двойник сводной страницы обновлений по всем машинам.
- Оценка: A.

**[BB-6] `bb guide terminals`**
- Локатор: строки 3–5 («Use terminals for long-running commands… A terminal is a real persistent PTY and appears in the bb UI»), 9–15 (создание со скоупом `--thread` / `--environment` / `--machine`).
- Факты: постоянные PTY-терминалы трёх скоупов и отображаются в UI как surfaces; attach/detach (Ctrl-B d), ожидание вывода по подстроке/регэкспу.
- Оценка: A.

**[BB-7] `bb guide automations`**
- Локатор: строки 1–2 («Automations schedule recurring or one-shot work. Agent automations run a prompt in a thread; script automations run stored code without model usage»), 15–17 (расписания: `--cron --timezone`, `--at`, `--in`), 59–61 («Opening a `Prompt required` record in the Automations panel takes you through the standard editor»), 10 (`bb automation runs` — история запусков), 56 (`runs --output`).
- Факты: automations — отдельная подсистема расписаний (cron/разовое/интервал) для агентских промптов и скриптов; в UI есть панель Automations с редактором и историей запусков; результат — тред/вывод скрипта.
- Оценка: A.

**[BB-8] `bb guide environments` (глава + блок bb connect)**
- Локатор: строки 8–65 (repo-хуки `.bb-env-setup.sh`/`.bb-env-teardown.sh`, `.worktreeinclude`), 67–127 (операции окружения: status, branches, diff, commit, squash-merge, archive-threads, destroy при архивации последнего треда), 134–149 («Remote access (bb connect): Expose this bb server at <handle>.getbb.app so you can reach it from any browser. Claim a handle at https://getbb.app»), 156–163 (`bb connect expose <port>` / `shares` / `servers` / `machine-code`), 165–176 («Server-host URLs use https://<server-label>--<port>.getbb.app … Access is owner-session-gated — only viewers signed into the owner's getbb.app account can open the URL»), 178–187 (мобильное приложение: QR-код, «Settings → Remote access → Add mobile device»), 189–192 («Remote access is owned by the builtin "connect" plugin (Plugins → connect shows the URL, QR code, mobile pairing, and shared ports)»).
- Факты: окружения — first-class сущность с diff/коммит/merge; удалённый доступ через туннель getbb.app (паринг, шаринг портов локальных серверов ссылками вида `https://<label>--<port>.getbb.app`, мобильное приложение); в UI есть страница Plugins → connect и Settings → Remote access; существует веб-дашборд аккаунта getbb.app (список машин, коды паринга — стр. 142–143, 185).
- Оценка: A.

**[BB-9] `bb guide customization`**
- Локатор: строки 1–31 (темы: `bb theme list/set/show/reset`, CSS-переменные, favicon-цвет; «applied live to every open window»), 58–66 («Settings → General includes app-wide preferences stored server-side»), 74–77 («Settings → Keyboard also includes `showKeyboardHints`»), 79–95 (General: `showUnhandledProviderEvents`, `steerActiveThreadOnEnter`, `streamerMode`), 100–102 (`bb settings show/ai-services/general/experiment/usage/version/reload`), 113–120 (эксперименты `changelogPreview`, `editMessages`), 122–124 («BB releases restorable provider sessions after 30 idle minutes»), 137–151 (серверные клавиатурные шорткаты: «Settings → Keyboard records per-command shortcut overrides… applied live to every connected window»), 166–171 (клиент-локальные настройки в localStorage).
- Факты: страницы настроек bb: General, Keyboard, Updates (BB-5), Experiments, Appearance (BB-11), Providers (BB-10), Memory/File openers/Plugin marketplaces (BB-11); темы применяются живо во все окна; часть настроек серверная (общая всем окнам), часть клиент-локальная.
- Оценка: A.

**[BB-10] `bb guide providers`**
- Локатор: строки 3–8 (`bb provider list/models`), 20–27 («Provider-native memory can be controlled on the separate Settings → Providers → Codex and Settings → Providers → Claude Code pages»), 29–34 (отключение провайдерных подагентов на тех же страницах), 74–77 (ACP-агенты: opencode, omp, grok, hermes появляются как провайдеры `acp-*`), 102–112 (кастомные модели через `customModels` в config.json + `bb-app config refresh`), 114–132 (кастомные ACP-агенты через `bb plugin config provider-acp set customAgents`), 140–143 (`sharedSkillRoots`).
- Факты: провайдеры = агентные бэкенды (codex, claude-code, pi, ACP-агенты); у каждого провайдера своя страница настроек в UI; кастомные модели и кастомные ACP-агенты добавляются конфигом без форка; переключение модели на живом треде — `bb thread update --model` (BB-3, стр. 243–249).
- Оценка: A.

**[BB-11] `bb guide plugins`** (ключевой источник по поверхностям UI)
- Локатор: строки 3–8 («A bb plugin is a TypeScript package that extends the bb server in-process and may also declare one bundled Node entry … background services, cron schedules, HTTP/RPC endpoints, thread lifecycle handlers, settings, storage … Plugins are full-trust code»), 15–17 (builtin Custom instructions: «adds a multiline editor under Settings → Custom instructions»), 91–98 (Memory: «Settings → Memory lists every global and project memory»), 168–177 (Secrets: «secure credential form»), 179–283 (жизненный цикл: install/update/outdated/enable/disable/reload/config/logs/new/types/migrate/build/dev), 242–247 (`bb plugin new` «Scaffold a todo-list plugin (server.ts, app.tsx with a sidebar page, a `bb <id>` CLI command, and a skill)»), 285–301 (маркетплейсы: `bb marketplace add https://…/marketplace.json | git: | path:`), 340–346 (официальные плагины GitHub/Docs/Memory/Tasks, «Extensions → Plugins → Browse»), 348–367 (BB Community marketplace `https://getbb.app/marketplace/v1/marketplace.json`, счётчики установок), 404–405 («Settings → Plugin marketplaces adds, refreshes, and removes marketplaces with the same server routes the CLI uses»), 414–419 (вкладка Browse группирует по издателю), 529–557 (слоты фронтенда: «register UI slots: homepageSection (root compose), settingsSection (per-plugin settings page …), navPanel (own sidebar entry + `/plugins/<id>/<path>/*` route …)», threadPanelAction («thread-only entry in an existing thread's right-panel new-tab Actions list … its run() can open closable panel tabs»), experimental_newThreadPanelAction, pendingInteraction, fileOpener («register as a per-extension file viewer/editor; users pick defaults under Settings → File openers»), messageDirective), 557–599 (хуки useRpc/useRealtime/useComposer/useBbNavigate, defineRpcContract + bb.rpc.register, shadcn-модель компонентов), 600–630 (fixedTabs, experimental_sidebarAccessory, «Installed plugins … also appear under Extensions → Plugins»), 632–645 (плагинные CLI-команды: «a plugin can register one top-level subcommand»), 756–760 (`bb.ui registerMentionProvider (host-rendered UI — no frontend bundle needed)`), 762–774 (composer customizations: `app.composer.customize({ actions, plusMenu, banners, richText })`), 780–783 (builtin inline-vis: «renders `::inline-vis{file="demo.html" …}` through the sidebar's path-shaped, sandboxed worktree HTML iframe preview»), 749–755 (`bb.background.service`/`bb.background.schedule (durable cron rows)`, `bb.agents.registerTool`, `bb.agents.configure`, `visibility: "hidden"` для фоновых воркеров).
- Факты: Plugin SDK даёт полноценные вне-чатовые поверхности: (1) `navPanel` — собственная страница плагина с записью в сайдбаре и маршрутом `/plugins/<id>/<path>/*` (панель-внутренние deep links, fixedTabs, header actions); (2) `homepageSection` — секция на корневом compose-экране; (3) `settingsSection` — страница настроек плагина; (4) `threadPanelAction` — вкладка в правой панели треда; (5) `fileOpener` — рендереры файлов по расширению; (6) `messageDirective` — компоненты внутри Markdown ассистента; (7) `messageAction`, `commandPaletteAction`, `sidebarFooterAction` (BB-12); (8) mention-провайдеры без фронтенд-бандла. Встроенные страницы приложения: Extensions → Plugins (+ Browse/store), Settings → Plugin marketplaces / File openers / Memory / Custom instructions / Appearance. Расширения могут владеть cron-расписаниями, фоновыми сервисами, HTTP-роутами, CLI-командами, нативными инструментами агента.
- Оценка: A.

**[BB-12] `bb skill show bb-plugin-authoring --path references/frontend-core-slots.md`** (id `skill_8bd17b42…`; копия в `$TMPDIR/bb-evidence/plugin-authoring/frontend-core-slots.md`)
- Локатор: строки 6–23 (content scripts: «runs ordinary bundled JavaScript/TypeScript in the bb app shell without a React slot… can access the app DOM»), 64–66 (`homepageSection` → `{ projectId }`), 74–75 («Enabled plugins appear in the settings sidebar when they declare settings descriptors OR register settings sections»), 76–101 (`navPanel` → `{ subPath }`, «owns the whole route at `/plugins/<pluginId>/<path>/*` and gets its own sidebar entry»; «BB automatically wraps every plugin page in the same host-owned App panel … BB owns the desktop split, compact drawer, header/panel toggle, resizing, tab strip, persistence»), 108–136 (fixedTabs + experimental_target), 158–194 (`threadPanelAction` рядом с «Start side chat» / «Start terminal»), 207–222 (`sidebarFooterAction` — иконка в футере сайдбара; `experimental_sidebarNavigation` — замена навигации над списком тредов), 223–243 (`fileOpener` — «Matching files opened in the right panel then render your component in a plugin tab instead of the built-in preview»).
- Факты: страница плагина в bb — это полноэкранная панель того же «App panel», что и треды: хост владеет сплитами, вкладками, drawer'ом; плагин рисует тело. Плагин может даже заменить навигацию сайдбара и (BB-13) сам список тредов. Это самый сильный механизм «отдельной страницы» среди двух инструментов.
- Оценка: A.

**[BB-13] `bb skill show bb-plugin-authoring --path references/frontend-registration.md`**
- Локатор: строки 39–133 (полный пример регистрации всех слотов, включая `app.slots.experimental_threadList({ id: "inbox", title: "Inbox", description: "One flat list, newest thread on top." })`), 139–156 (`experimental_threadHeaderAction` — контрол в шапке треда), 162–180 («`app.slots.experimental_sidebarNavigation` replaces the navigation controls above the thread list. The items represent New thread, Search threads, Extensions, and plugin panels… Users can select Automatic, BB, or one plugin under Settings → Appearance → Navigation»), 182–210 («`app.slots.experimental_threadList` is the one **exclusive** slot: only one list fills the sidebar's scroll area… The user can pin BB's list or a specific provider under Settings → Appearance → Sidebar»).
- Факты: список тредов и навигация сайдбара — заменяемые поверхности (пользователь выбирает реализацию в Settings → Appearance); действия над списком (New thread, Search, Extensions, панели плагинов) — семантические элементы хоста.
- Оценка: A.

**[BB-14] `bb skill show bb-plugin-authoring --path references/frontend-renderer-slots.md`**
- Локатор: строки 4–13 (`experimental_sourceCodeRenderer` / `experimental_diffRenderer` — «replace bb's source or diff renderer everywhere it draws supplied content: the native file preview, timeline file diffs, the environment diff panel's file bodies»; выбор в «Settings → Appearance ("Source code" / "Diffs")»), 44–73 (`messageDirective`, реф. `plugins/inline-vis`), 74–88 (`messageAction` — «an icon button in the per-message action bar … and an entry in the assistant-message text-selection menu»), 89–100 (`commandPaletteAction` — «a row in bb's quick palette (Mod+Shift+P)»), 101–121 (`experimental_timelineRenderer` — рендер строк таймлайна провайдера), 122–137 (`experimental_providerIcon`), 8–9 («Like `experimental_threadList` each slot is **exclusive**»).
- Факты: рендереры кода/диффов/таймлайна и иконки провайдеров заменяемы; действия над сообщениями и палитрой команд — хостируемый хром с плагинной логикой.
- Оценка: A.

**[BB-15] `bb plugin list`** (копия `plugin-list.txt`)
- Локатор: строки 1–63: builtin-плагины `ask-user-question` (disabled), `automations`, `concurrency-limit`, `connect`, `custom-instructions`, `inline-vis`, `keep-awake`, `memory`, `monaco-editor`, `pdf-preview`, `plugin-api-docs`, `plugin-api-tester` (disabled), `provider-acp`, `provider-claude-code`, `provider-codex`, `provider-pi`, `provider-retry`, `scheduled-send`, `secrets`, `side-chat`, `workflows`; у каждого — статус, сервисы, cron-расписания (напр., стр. 58: side-chat «schedule empty-fork-cleanup (13 * * * *)»), CLI-команды.
- Факты: даже файловые рендереры (`monaco-editor`, `pdf-preview`) — плагины; automations и workflows — плагины; список подтверждает тезис getbb.app «даже remote access — плагин».
- Оценка: A.

**[BB-16] `bb skill list`** (копия `skill-list.txt`)
- Локатор: таблица навыков с колонками ID/NAME/SCOPE/PROVIDER/EDITABLE/PATH; builtin `bb-cli`, `bb-plugin-authoring`, `skill-creator`, `submit-a-plugin` (стр. 1–9); provider-project навыки текущего репозитория dsh для claude-code и codex; provider-user навыки из `~/.agents/skills`, `~/.claude/skills`, `~/.hermes/skills`, `~/.pi/agent/skills`.
- Факты: bb агрегирует навыки всех провайдеров и корней в один список с прозрачным скоупом; встроенные навыки можно поставить в глобальные корни агентов (`bb skill install-cli-skills`, BB-17).
- Оценка: A.

**[BB-17] `bb guide agent-configuration`**
- Локатор: строки 6–25 (`<dataDir>/AGENTS.md` и `<workspace>/.bb/AGENTS.md` добавляются в системный промпт), 27–50 (навыки: `builtin` → `user` → `project`, `.bb/skills/<name>/SKILL.md`, реестр skills.sh: `bb skill search/registry detail/install`), 58–68 (`bb skill install-cli-skills` → `~/.agents/skills` и `~/.claude/skills`; «Settings → Skills exposes the same action»).
- Факты: страница Settings → Skills существует; конфигурация агента — AGENTS.md + навыки трёх уровней; реестр навыков skills.sh.
- Оценка: A.

### Группа B. dsh — репозиторий deepseek-harness (первичные)

**[DSH-0] `git rev-parse HEAD`**
- Локатор: `d6d62f6dce085c7f52630811121c056b4351102f` (2026-09-01).
- Факты: зафиксированный срез dsh.
- Оценка: A.

**[DSH-1] `docs/architecture.md`**
- Локатор: строки 11–13 («Every part of the product is a plugin … each is replaceable from configuration … you extend dsh by mounting a plugin beside the others»), 19–29 (профили и бандлы: `web`, `headless`, `sdk`, `sdk-minimal`, `acp`; `dsh-web-app` «adds the browser application»; патчи `cordis.patch.yml`), 43 (запуск: «`dsh web` (the deliberate alias for `--profile web`)»), 49–62 (таблица core-пакетов: session, system-prompt, tools, agent, agent-loop, scope, llm, webhook), 119–145 (карта точек расширения, в т. ч. строки 137–138: «Add UI or editor integration | drive `ctx.agents` and render from `session/event`», «Add a Web Client Chat node | register a `ConversationNodeDefinition` + keyed renderer», стр. 130–131: «Add background work | register on `ctx.jobs`», стр. 132: webhook → Session).
- Факты: all-plugin архитектура; веб-приложение — один из профилей запуска; расширяемость через сервисы/события/слоты, а не через страницы.
- Оценка: A.

**[DSH-2] `docs/subsystems/web-client.md`**
- Локатор: строки 3–5 («The Web Client is a browser-side Cordis application assembled from independently loaded plugins … Client Modules … API Gateway … Slots … Conversation»), 9–16 (таблица слоёв: Host application → transport → Client models (`api/session-controller/client`, `api/workspace-controller/client`) → UI adapters (`ui-session`, `ui-workspace`) → Conversation (`ui-conversation`, `ui-chat`, `ui-trajectory`) → Slots/`ui-renderer`), 22–24 (браузерная загрузка: «The Host writes the composed `WebBootGraph` to `window.__DSH_BOOT__`… `ui-renderer` hydrates … and calls the sole context-level `renderSlot('root')` operation»), 40–46 (Sessions: list, search, creation, pagination, follow/control streams), 48–52 (Workspaces: `ctx.workspaces`, строки `upsert/remove/order/archived`).
- Факты: весь веб-клиент — одно дерево, отрисованное из единственного слота `root`; модели сессий и воркспейсов — клиентские проекции host-контроллеров; список сессий, поиск и создание — host-API.
- Оценка: A.

**[DSH-3] `docs/subsystems/slots.md`** (ключевой источник по оси 1 для dsh)
- Локатор: строки 5–7 («Slots are the Web Client's typed React composition system … A feature plugin contributes UI through `ctx.slots.register()`»), 15 («`root` is the only built-in declaration and the only key rendered through the Cordis service itself»), 44–58 (кардинальности single/list/keyed/chain и скоупы root/session-maybe/session), 79–92 (стандартные хуки: `useSessions`, `useWorkspaces`, `useSession`, `useProjection`, `useConversation`, `useChat`, `useTrajectory`), 106–163 (полное дерево: `root ├─ sidebar … ├─ conversation … ├─ details └─ shell.overlay`), 165 («The generated Client inspect catalog is the exhaustive contract for each key … `cordis_inspect what:"client"`»), 167–175 (правила расширения: «Declare a new child slot only in the component that owns and renders that location»).
- Факты: исчерпывающее дерево слотов dsh-web не содержит ни одной «страницы» или «маршрута»: все точки расширения — внутри трёх колонок (сайдбар, диалог, детали) и оверлея. Секция настроек — `settings.section` (список страниц внутри панели настроек); действия сессии — `conversation.session.header.actions`; просмотр воркспейсов — `sidebar.workspaces`; `details` имеет единственный дочерний слот `conversation.details.tool`. Слоты — единственный способ расширить UI (плюс замена `single`-ячеек как точка подмены).
- Оценка: A (сгенерированный каталог, сверяемый гейтом `verify-client-catalog`).

**[DSH-4] `packages/client/ui-layout/src/client/AppFrame.tsx`**
- Локатор: строки 1–12 (doc-комментарий: «Three-column shell frame, registered into the built-in 'root' slot (the web shell renders only 'root'). Owns the grid tracks (sidebar | center | details)…»), 24–27 (`AppFrameProps` = `PropsRenderSlots<'sidebar' | 'conversation' | 'details' | 'shell.overlay'>`), 188–216 (рендер: `renderSlot('sidebar')`, `CenterColumn > renderSlot('conversation')`, `DetailsColumn > SessionProvider > renderSlot('details')`, overlay-слой, drag-ручки).
- Факты: оболочка dsh-web — фиксированная трёхколоночная сетка без роутинга; «страница» в ней возможна только как содержимое одной из колонок или оверлея.
- Оценка: A.

**[DSH-5] `packages/client/ui-sidebar/src/client/SidebarRoot.tsx` + `contract/slots.ts`**
- Локатор: SidebarRoot.tsx:8–11 («The workspace/session browsing region … is the `sidebar.workspaces` registrant's, and the foot holds `sidebar.settings` plus `sidebar.footer.action`»), 140–200 (бренд-строка = кнопка New Session; кнопка New Session), 204–218 (области `renderSlot('sidebar.workspaces')`, `renderSlot('sidebar.footer.action')`, `renderSlot('sidebar.settings')`), 100–103 («ui-settings renders its full-viewport panel as a fixed-position DESCENDANT of this column»). contract/slots.ts:23–46 (объявления `sidebar.brand.mark/name`, `sidebar.workspaces`, `sidebar.settings`, `sidebar.footer.action`).
- Факты: сайдбар = бренд + New Session + браузер воркспейсов/сессий + футер-действия + триггер настроек; настройки открываются полноэкранной панелью-потомком колонки (не маршрутом); футер-действия — list-слот, куда ui-cordis добавляет свою кнопку (DSH-9).
- Оценка: A.

**[DSH-6] `packages/client/ui-settings/src/client/contract/slots.ts` + `index.ts`**
- Локатор: index.ts:4–9 («the settings SHELL — the `sidebar.settings` occupant, its navigation, and the chrome — lives in ui-settings-general»), contract/slots.ts:8–12 («A feature owns its own settings pages — adding a setting never means editing the shell»), 44–54 (`settings.trigger/header/action/close/onboarding`, `settings.section`: «One settings page per list entry … `id` (section key), `order` (nav position), `label`»), 56–60 (`settings.plugins.tab` → `settings.plugin.item`).
- Факты: настройки — модальная панель с навигацией по секциям; каждый фича-плагин добавляет свою страницу настроек декларацией в list-слот (страницы: General, Models (DSH-8), Plugins с вкладками).
- Оценка: A.

**[DSH-7] `packages/client/ui-workspace/README.md`**
- Локатор: строка 12 («users browse grouped or flat Session rows in the sidebar, pick a Workspace for a new session from the Session Intent hero, and manage Workspaces and Sessions with add, rename, reorder, search, fork, and archive actions»; там же: «Pending user interactions surface as amber warning dots, active Schedule projections surface as non-interactive alarm markers»), разделы «Reordering and view options» (Manual/Last updated, drag), «Search» («case-insensitive title and Workspace substring matches … 250 ms debounced Host request adds ranked current-conversation content matches and snippets … capped at 20»), «Managing sessions» (rename/archive/fork).
- Факты: история сессий — боковой браузер с группировкой по воркспейсам, поиском по заголовкам и содержимому, ручным/автоматическим порядком, форком и архивацией; «hero» нового диалога выбирает воркспейс. Это единственный обзорный экран «что происходило», и он живёт внутри сайдбара, вне чата, но и не является отдельной страницей.
- Оценка: A.

**[DSH-8] `docs/user/guide/providers.md`**
- Локатор: строки 9 («Open **Settings → Models**. The DeepSeek card exposes one API-key field»), 11 (скриншот Models page: «the DeepSeek card, with Add provider and Add a custom provider below it»), 17–29 (Add provider из каталога; Add a custom provider: Provider ID/base URL/протокол/credential/модели, «Fetch available models»), 118–122 («Configured providers appear in the model picker. Selecting a model also makes it the default for new sessions»), 135–137 (конфиг-каталог).
- Факты: страница Models в панели настроек — полноценный менеджер провайдеров (карточки, каталог, кастомные эндпоинты, fetch моделей); ключи write-only в `$DSH_HOME/.credentials.yaml` (стр. 13).
- Оценка: A.

**[DSH-9] `packages/extensions/README.md` + `packages/extensions/ui-cordis/README.md` + `ui-cordis/src/client/index.ts`**
- Локатор: extensions/README.md:12 («the model can inspect the plugins and services loaded in the current DSH process, define a dynamic Cordis package (with a host half, a browser half, or both), run it, stop it, and remove it, and a browser panel operates every definition»); ui-cordis/README.md:12 («a frame-wide panel that operates every definition the host holds … The panel is global on purpose — a model-driven run blocks on a person's approval, and that approval must be reachable no matter which session is in view»); index.ts:87–88 (`ctx.slots.inject('sidebar.footer.action', …)`), 118–145 (`tool.call.toolview` keyed-карточки cordis_define/run/stop/undefine).
- Факты: единственная «frame-wide» (вне-сессионная) панель dsh-web — панель динамических Cordis-пакетов, открывается из футера сайдбара; плагины могут добавлять карточки инструментов в диалог и входные источники `@pluginId`.
- Оценка: A.

**[DSH-10] `packages/client/modules/README.md` + `scripts/gen-client-catalog.ts`**
- Локатор: modules/README.md:12 («`dsh-client-modules` turns a plugin package's `dsh.client` declaration into a loadable browser bundle: the host half scans enabled Loader entries, composes the boot graph, and serves each bundle over `/plugins`»), 26–30 («Declaring a client plugin: a browser plugin package declares `dsh.client` in its `package.json` with `platform: 'web'`»); gen-client-catalog.ts:2–4 («A dynamic package's browser half can only contribute UI through `ctx.slots.register`, and every fact it needs … is decided at compile time by the shipped web bundle»).
- Факты: механизм UI-плагинов dsh: пакет с `dsh.client` грузится браузером как бандл и регистрирует компоненты в объявленные слоты; произвольную новую «страницу» он создать не может — только занять существующий слот (замена `single`-ячейки или новый элемент list/keyed).
- Оценка: A.

**[DSH-11] `packages/client/ui-slots/README.md` + `src/index.ts`**
- Локатор: README.md:10–14 («One `register({ name, children?, store?, inject?, ...kind }, Component)` call contributes a component into a declared slot…»; «Chain-kind slots invert keyed routing»), 22–27 («Declaring a slot is claiming it … registering into an undeclared slot … throws at load»); index.ts:26 (`export interface SlotMap {}` — пустая карта, наполняется declaration merging).
- Факты: типовая алгебра слотов: 4 вида (single/list/keyed/chain) × 3 скоупа; строгость на этапе загрузки; расширение — через `declare module`.
- Оценка: A.

**[DSH-12] `apps/web` (entry + build)**
- Локатор: `apps/web/src/main.ts:1–5` («Browser entry … `new AppWebEntry(el).run()`» — монтирование в `#root`); `apps/web/package.json:2–3` («Web application entry: vite build over the @deepseek-ai/dsh-client-web shell library; dist/ served by apps/cli's dsh web»); `apps/web/vite.config.ts:8–11` («apps/web is not a standalone application: bare Vite cannot inject window.__DSH_BOOT__. From a repository checkout, run `pnpm dsh web`»).
- Факты: фронтенд — статический vite-бандл без собственного сервера и роутера; обслуживается хостом `dsh web`; самостоятельный запуск отвергается на уровне сборки.
- Оценка: A.

**[DSH-13] `packages/host/webserver/src/index.ts`**
- Локатор: строки 59–63 (`Config { host: '127.0.0.1' | '0.0.0.0'; port: number }`), 1–6 (doc: «a single `node:http` plugin providing `ctx.webServer`, a named-route registry … It serves browsers only»).
- Факты: веб доступен по локальному HTTP (loopback по умолчанию, опция всех интерфейсов); туннелей, шаринга ссылок или публичного доступа в ядре нет.
- Оценка: A.

**[DSH-14] `docs/user/guide/schedule.md`**
- Локатор: строки 5–9 (оверлей `dsh web --patch apps/cli/config/examples/schedule/cordis.yml`; `schedule_create/list/delete`; «every result identifies delivery as `session-local`»), 13 («a successfully opened Session with active reminders shows a read-only catalog in the conversation header… The sidebar also places a non-interactive alarm after the title of grouped, flat, and search rows»), 17–19 (доставка — отложенный ход в той же сессии; «Calendar and Cron expressions are not supported»), 21 («Schedule does not provide browser, operating-system, email, SMS, or other external notification»).
- Факты: schedule dsh — напоминания внутри одной сессии; каталог — поповер в шапке диалога, маркер в строке сайдбара; нет cron, нет внешних уведомлений, нет межсессионного планировщика.
- Оценка: A.

**[DSH-15] `packages/client/ui-jobs/src/client/JobListAction.tsx` + `packages/client/ui-schedule/src/client/ScheduleCatalogAction.tsx`**
- Локатор: JobListAction.tsx:11 и ScheduleCatalogAction.tsx:19 (оба — `PropsRuntime<'conversation.session.header.actions'>`); ScheduleCatalogAction.tsx:16 (`createPortal`), JobListAction.tsx:36–56 (статусы running/stopping/completed/killed/failed).
- Факты: фоновые задачи и расписание — это действия в шапке сессии (поповеры), не отдельные экраны; наблюдение за фоновыми задачами привязано к открытой сессии.
- Оценка: A.

**[DSH-16] `docs/subsystems/workspace.md`**
- Локатор: строки 3–5 («A workspace is the persistent record of a directory the user works in: a stable id over a canonical path, a display title, and the ordered account of sessions that belong to it … invisible to models»).
- Факты: воркспейс dsh ≈ проект bb: группировка сессий по каталогу с ручным порядком.
- Оценка: A.

**[DSH-17] `docs/subsystems/webhook.md`, `packages/acp/README.md`, `docs/subsystems/workflow.md`, `docs/subsystems/sandbox.md`, `docs/subsystems/session-title.md`**
- Локатор: webhook.md:3–5 («turns authenticated external deliveries into optional ordinary root Sessions … `ctx.webhookRuntime` owns callback lifetime plus Workspace-backed Session creation»); acp/README.md:12 («a server that lets programs and automation run persistent DeepSeek Harness agents over the standard Agent Client Protocol. A client can create, list, resume, and close sessions»); workflow.md:3–5 («the workflow seam lets an agent run a model-written orchestration SCRIPT that starts subagents … one engine implementation per context», provider `dsh-workflow-worker-thread`); sandbox.md:5–7 («supplies Linux bwrap/Landlock, macOS Seatbelt, and the Windows ACL restricted-token backend»); session-title.md:3–5 («Durable latest-wins title state and the optional asynchronous provider vocabulary»).
- Факты: вход извне — webhook-сессии; программный доступ — ACP/SDK; оркестрация — workflow-скрипты с подагентами; песочницы — bwrap/Landlock/Seatbelt/ACL; автотайтлы сессий — отдельный провайдер.
- Оценка: A.

**[DSH-18] Полнотекстовый поиск по репозиторию: `grep -rin "dashboard" docs/ packages/client packages/api` и `grep -rin "tunnel" docs/subsystems README`**
- Локатор: обе команды возвращают пустой результат на срезе d6d62f6dce (кроме `dist`-артефактов, исключённых из поиска).
- Факты: понятия «дашборд» и «туннель» в публичных контрактах dsh отсутствуют. Отрицательный факт слабее положительного; усилен структурой слотов (DSH-3) и отсутствием роутера в оболочке (DSH-4).
- Оценка: B (отрицательное доказательство, ограниченное срезом и поиском по тексту).

**[DSH-19] `docs/cookbook/adding-a-tool.md`**
- Локатор: строки 9–38 (минимальный `defineTool`), 53–56 (фоновые задачи через `ctx.jobs.start`), 69–91 (карточки UI: `presentCall`/`presentResult`, виды `generic/terminal/diff/read/search/web`), 93–97 («The built-in Web Client does not consume `presentCall` or `presentResult`. … A Client plugin registers its wire tool name in the `tool.call.toolview` keyed slot and derives component props from the `ToolCallBlock` …»).
- Факты: карточки инструментов в вебе — отдельная клиентская регистрация в keyed-слоте; презентации чистые и воспроизводимы на реплее.
- Оценка: A.

### Группа C. Вторичная корроборация (публичный веб)

**[WEB-1] github.com/get-bb/bb и getbb.app (результаты поиска, без глубокого чтения)**
- Локатор: поисковая выдача: репозиторий «get-bb/bb: The agent IDE that builds itself» («open source, MIT licensed agent orchestrator… works with all of the popular coding agents out of the box»); getbb.app: «The GitHub integration, agent memory, scheduled jobs, and even remote access are all plugins».
- Факты: подтверждает существование и самопозиционирование bb; тезис «всё — плагины» совпадает с BB-15. Никаких фактов, которых нет в BB-1…BB-17, не добавляет.
- Оценка: C (вторичная, только корроборация; в матрицу решения не входит).

---

## Пересечения bb и dsh (функциональные зоны совпадения)

| Зона | bb | dsh | Источники |
|---|---|---|---|
| Агенты/сессии | треды в проектах, parent-child, fork, hidden-воркеры, archive | сессии в воркспейсах, fork, фоновые jobs, archive, автотайтлы | BB-2, BB-3; DSH-2, DSH-7, DSH-16, DSH-17 |
| Skills | трёхуровневые навыки + skills.sh + установка в корни провайдеров | подсистема skill (`packages/skill`), навыки как slash-команды | BB-16, BB-17; DSH-1 (стр. 49–62 — ядро), CLAUDE.md репозитория |
| Плагины | Plugin SDK: сервисы + cron + HTTP + UI-слоты + CLI-команды, маркетплейс | Cordis-плагины: сервисы/события + клиентская половина (`dsh.client`) + UI-слоты; динамические пакеты из чата | BB-11, BB-12, BB-15; DSH-9, DSH-10, DSH-11 |
| UI-расширяемость | navPanel-страницы, homepageSection, замена списка тредов/навигации/рендереров | регистрация только в объявленные слоты трёхколоночной оболочки; свои страницы настроек | BB-11–BB-14; DSH-3–DSH-6, DSH-10 |
| MCP | в `bb guide` не упоминается (пробел); провайдеры — ACP-агенты | первый `dsh-mcp-client`: инструменты MCP как нативные (`mcp__<server>__<tool>`) | BB-10 (отсутствие упоминания); docs/user/guide/mcp-memory.md:1–11, packages/mcp/README.md:2–3 |
| Воркфлоу/автоматизации | automations (cron/one-shot, агент или скрипт) + workflows-плагин (durable JS-оркестрация) | schedule (напоминания внутри сессии) + workflow-сьема (worker-thread движок) + ctx.jobs | BB-7, BB-11 (стр. 59–89); DSH-14, DSH-15, DSH-17 |
| Терминалы | постоянные PTY трёх скоупов, видны в UI | `ctx.terminals` + `dsh-tool-terminal`, постоянные PTY-сессии | BB-6; DSH-1 (стр. 129), docs/subsystems/terminal.md:3–7 |
| Провайдеры/модели | провайдеры-бэкенды (codex, claude-code, pi, acp-*), страницы настроек провайдеров, кастомные модели | адаптеры на `ctx.llm` (pi-ai, deepseek), страница Settings → Models, кастомные эндпоинты | BB-10; DSH-8, DSH-1 (стр. 125) |
| Изоляция | permission-mode тредов, лимит разрешений машины, воркспейс-песочница | `ctx.sandbox` (bwrap/Landlock/Seatbelt/ACL), fs-политика | BB-3 (стр. 38–41), BB-5; DSH-17 |
| Шаринг вовне | bb connect: туннель `<handle>.getbb.app`, шаринг портов, мобильное приложение, дашборд аккаунта | локальный веб-сервер, webhook-вход, ACP/SDK для программ; туннеля и шаринг-ссылок нет | BB-8; DSH-13, DSH-17, DSH-18 |

---

## Сводка фактов по осям

### Ось 1. Поверхности вне чата: отдельные страницы и дашборды (вес 30%)

**bb (установлено):**
- Сайдбар с проектами (переставляемыми), секциями тредов, заменяемым списком тредов и заменяемой навигацией; кнопка Extensions и панели плагинов — семантические элементы навигации (BB-3, BB-4, BB-13).
- Полноценные отдельные страницы: страница плагина (`navPanel` → `/plugins/<id>/<path>/*`, собственный пункт сайдбара, fixedTabs, deep links) (BB-11, BB-12); страницы настроек Settings → General / Keyboard / Updates / Machines (+карточка машины) / Providers → Codex|Claude Code / Memory / File openers / Plugin marketplaces / Appearance / Experiments / Skills / Remote access / Custom instructions (BB-5, BB-8–BB-11, BB-13, BB-17); панель Automations с редактором и историей запусков (BB-7); Extensions → Plugins → Browse/store (BB-11, BB-15).
- Дашборд-подобные агрегаты: `bb updates` (сводка обновлений по всем машинам; «the CLI counterpart of Settings → Updates and the sidebar Updates badge») (BB-5); `bb machine list` со статусами подключения и last-seen (BB-5); `bb automation runs` (история запусков) (BB-7); `bb thread count --by host|provider|project` (BB-3); счётчики/статусы в `bb plugin list` (BB-15). Отдельная «страница-дашборд» со всеми этими данными в одном месте в справочнике не названа — ближайшие аналоги: страница машины в Settings, сводка Updates и панели плагинов; плюс веб-дашборд аккаунта getbb.app (список машин, паринг) как облачная поверхность (BB-8).
- Домашний экран compose имеет слот `homepageSection` для агрегированных секций плагинов (BB-11, BB-12); плагин может собрать дашборд как navPanel-страницу с live-данными через useRpc/useRealtime (BB-11, BB-12) — то есть дашборд в bb достижим и «из коробки» через существующие панели, и расширением класса S/M.

**dsh (установлено):**
- Оболочка — трёхколоночная сетка (sidebar | conversation | details) + shell.overlay; рендерится из единственного слота `root`; роутинга нет (DSH-2, DSH-4).
- Вне-чатовые поверхности, которые реально существуют: боковой браузер воркспейсов и сессий (группировка, поиск по заголовку и содержимому, ручной/авто-порядок, rename/fork/archive, алармы расписаний) (DSH-7, DSH-16); панель настроек с секциями General / Models / Plugins(вкладки) (DSH-5, DSH-6, DSH-8); поповеры Jobs и Schedule в шапке сессии (DSH-15); frame-wide панель динамических Cordis-пакетов (DSH-9); hero нового диалога с выбором воркспейса (DSH-7).
- Чего нет: навигационных элементов первого класса на не-чатовые экраны (нет слота «страница», нет списка маршрутов — DSH-3, DSH-4), агрегированного дашборда (текстовый поиск «dashboard» пуст — DSH-18), межсессионного обзора задач/машин (jobs привязаны к сессии — DSH-15; машин как сущности в dsh нет вовсе).
- Гипотеза пользователя «в dsh всё в едином окне чата» подтверждается частично: браузер сессий и настройки — вне потока сообщений, но это либо колонка сайдбара, либо модальная панель, а не отдельные страницы (DSH-4, DSH-5, DSH-6).

Источники: BB-2…BB-17; DSH-2…DSH-9, DSH-15, DSH-18.

### Ось 2. Управление сессиями и тредами (вес 12%)

- bb: проект → тред; секции, архив, hidden-треды, fork с якорем на ход, счётчики по измерениям, поиск по тредам и сообщениям, заголовки с фолбэком на первый промпт, sticky-модель, очередь сообщений с причинами, persisted panel tabs (BB-3, BB-4).
- dsh: воркспейс → сессия; порядок manual/last-updated с host-долгим порядком воркспейса, поиск (метаданные мгновенно + debounced контентный с ранжированием и сниппетами, лимит 20), rename (с фиксацией автотайтла), fork на последнем завершённом ходе, archive,amber-точки ожидающих вопросов (DSH-7, DSH-16, DSH-17).

Источники: BB-3, BB-4; DSH-2, DSH-7, DSH-16, DSH-17.

### Ось 3. Расширяемость: плагины, skills, MCP (вес 15%)

- bb: Plugin SDK полного доверия — фоновые сервисы, cron, HTTP/RPC, lifecycle-хендлеры, settings, storage, CLI-команды, нативные инструменты агента, UI-слоты (включая страницы, замену списка тредов, рендереров кода/диффов, упоминания, действия сообщений); маркетплейсы (bb-community + сторонние) и официальный стор; навыки builtin/user/project + skills.sh + установка в корни провайдеров; MCP в `bb guide` не упоминается (BB-11…BB-14, BB-16, BB-17).
- dsh: all-plugin Cordis; клиентская половина плагина через `dsh.client` → бандл под `/plugins` → `ctx.slots.register` в объявленные слоты; строгая типовая алгебра слотов и сгенерированный исчерпывающий каталог, доступный модели через `cordis_inspect what:"client"`; динамические пакеты создаются и запускаются из чата (инструменты `cordis_*`) (DSH-9, DSH-10, DSH-11, DSH-19; docs/subsystems/slots.md:165). MCP — первый сторонний клиент, инструменты как нативные `mcp__<server>__<tool>` (packages/mcp/README.md:2–3; docs/user/guide/mcp-memory.md:5–11).
- Ключевая асимметрия для оси 1: в bb плагин может добавить новую страницу; в dsh плагин может занять только существующие слоты трёхколоночной оболочки (DSH-3, DSH-4, DSH-10).

Источники: BB-11…BB-17; DSH-9, DSH-10, DSH-11, DSH-19, packages/mcp/*.

### Ось 4. Воркфлоу и автоматизации (вес 10%)

- bb: automations (cron/one-shot/интервал, агентский промпт или сохранённый скрипт, история запусков, панель Automations) (BB-7); workflows-плагин — durable provider-независимая JS-оркестрация с историей JSONL и лимитами (BB-11, стр. 59–89); scheduled-send plugin (BB-15).
- dsh: schedule — напоминания одной сессии (after/at/every ≥300s, без cron), доставка отложенным ходом, без внешних уведомлений, только с оверлеем (DSH-14); workflow-сьема — модель-писанный скрипт оркестрации с подагентами, один worker-thread движок на контекст (DSH-17); `ctx.jobs` — фоновые задачи инструментов (DSH-15, DSH-19).

Источники: BB-7, BB-11, BB-15; DSH-14, DSH-15, DSH-17.

### Ось 5. Агентное ядро (вес 10%)

- dsh (документировано подробно): agent-loop с waterfall-точками, compaction, plan, todo, subagent, guard, interaction/permission, цели, форк живой сессии, пресеты агентов, проекции лога (DSH-1, стр. 49–62, 74–101, 119–145).
- bb: parent-child треды с жёстким потолком permission-mode, план (`--plan`, approve/deny через interactions), компакция (`bb thread compact`), hidden-воркеры, ретраи провайдера (плагин), подагенты провайдера отключаемы на странице провайдера; оркестрация — workflows/Tasks-плагины (BB-3, BB-5, BB-10, BB-11).
- Замечание об асимметрии доказательной базы: для dsh ядро описано собственной архитектурной документацией; для bb эквивалентного «ядерного» справочника нет — факты собраны из командных справок (см. «Тонкие места»).

Источники: DSH-1; BB-3, BB-10, BB-11.

### Ось 6. Терминалы и песочницы (вес 10%)

- bb: постоянные PTY трёх скоупов (thread/environment/machine), видны в UI, attach/detach, ожидание вывода (BB-6); окружения — checkout/worktree с repo-хуками и автоуничтожением (BB-8); машины — хост-демоны с лимитом разрешений (BB-5); permission-режимы тредов с воркспейс-песочницей (BB-3, стр. 38–41).
- dsh: `ctx.terminals` + `dsh-tool-terminal` (постоянные PTY), `ctx.shell`/`ctx.subprocess`, песочницы bwrap/Landlock/Seatbelt/ACL, fs-политика, e2b-провайдер (DSH-1, стр. 128–134; DSH-17).

Источники: BB-3, BB-5, BB-6, BB-8; DSH-1, DSH-17.

### Ось 7. Провайдеры и модели (вес 5%)

- bb: провайдеры — агентные бэкенды; автообнаружение ACP-агентов; кастомные модели (`customModels`) и кастомные ACP-агенты без рестарта; страницы настроек провайдеров; смена модели на живом треде sticky (BB-3 стр. 243–249, BB-10).
- dsh: адаптеры на `ctx.llm` (pi-ai/deepseek), каталог провайдеров, кастомные эндпоинты с fetch моделей и compat-переключателями, write-only ключи, смена модели — «на следующий запрос без рестарта», дефолт для новых сессий (DSH-8).

Источники: BB-3, BB-10; DSH-8, DSH-1 (стр. 125).

### Ось 8. Шаринг и доступ извне (вес 8%)

- bb: bb connect — туннель `<handle>.getbb.app` до браузера с любого устройства, шаринг портов локальных серверов ссылками (owner-session-gated), мобильное приложение с QR-парингом, облачный дашборд аккаунта (BB-8).
- dsh: локальный HTTP (loopback/0.0.0.0) (DSH-13); вход извне — webhook → сессии (DSH-17); программный доступ — ACP-сервер и SDK (DSH-17); туннелей/шаринг-ссылок нет (DSH-18 — отрицательное доказательство).

Источники: BB-8; DSH-13, DSH-17, DSH-18.

---

## Тонкие места (оси/факты с недостаточной доказательной базой)

1. **Ось 5 для bb** — самая тонкая: у bb нет главы справочника про агентное ядро; факты о планировании, компакции и подагентах собраны косвенно из `bb guide threads/providers/plugins` (BB-3, BB-10, BB-11). Отсутствует первичный документ, перечисляющий встроенные инструменты агента bb.
2. **Запуск UI не выполнялся ни для одного инструмента**: утверждения о поведении интерфейсов опираются на первичные тексты продуктов (справочник bb и код/доки dsh), не на наблюдение экранов. Для dsh частично компенсируется исполняемым гейтом `verify-client-catalog` над деревом слотов (DSH-3, scripts/gen-client-catalog.ts:14–15), для bb — только текстом `bb guide`.
3. **MCP у bb**: пробел документации, не доказательство отсутствия (возможна поддержка внутри провайдерных CLI). Для симметричного сравнения по оси 3 нужен отдельный проверочный шаг (например, поиск в исходниках github.com/get-bb/bb).
4. **Отрицательные факты dsh** («нет дашборда», «нет туннеля»): полнотекстовый поиск пуст (DSH-18), структура слотов и оболочки их подтверждает (DSH-3, DSH-4), но формально это отсутствие доказательства, а не доказательство отсутствия; срез — один коммит.
5. **Дашборд getbb.app** (BB-8): описан в справочнике bb как облачная поверхность аккаунта; его состав (виджеты, реалтайм) из локальных источников не устанавливается — нужен просмотр сайта при необходимости.
6. **Ось 1 для dsh: «страницы настроек»** — перечень секций (General/Models/Plugins) подтверждён; полный список секций в реальных сборках может шире за счёт `settings.section`-регистраций фича-плагинов (DSH-6); исчерпывающий список на срезе не генерировался (доступен через `cordis_inspect what:"client"` на живом инстансе).
