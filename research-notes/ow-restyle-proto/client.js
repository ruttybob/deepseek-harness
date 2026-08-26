// Throwaway prototype source for beads ticket dsh-ood.5 (parent map dsh-ood).
// Dynamic Cordis client package owsty-1/pkg-2, run live against the web GUI.
// Re-run: cordis_define (client half = this file's returned plugin) + cordis_run.
//
// Variant bar (shell.overlay) switches token layers through
// ctx.theme.overrideTokens(source, { name: { light, dark } }); Geist arrives
// via a CDN @import for the prototype only — the production port self-hosts
// woff2 (dsh-ood.3, KaTeX precedent).
return {
  apply(ctx) {
    const theme = ctx.get('theme')
    const slots = ctx.get('slots')
    if (theme === undefined || slots === undefined) return

    const SOURCE = 'ow-proto'
    const P = (light, dark) => ({ light, dark })

    // Locked OW-to-DSH mapping (dsh-ood.5 inputs, dsh-ood.4 resolution):
    // Zinc ramp, single Work Cobalt, Signal status inks, opaque hairlines,
    // neutral solid assistant bubble.
    const colors = {
      '--dsw-alias-bg-base': P('#F5F6F7', '#131417'),
      '--dsw-alias-bg-layer-1': P('#FFFFFF', '#1C1E22'),
      '--dsw-alias-bg-layer-2': P('#FFFFFF', '#1C1E22'),
      '--dsw-alias-bg-layer-3': P('#FFFFFF', '#1C1E22'),
      '--dsw-alias-bg-module-platform': P('#F5F6F7', '#131417'),
      '--dsw-alias-bg-multi-select': P('#E9F0FD', '#1C2A44'),
      '--dsw-alias-bg-overlay': P('#FFFFFF', '#1C1E22'),
      '--dsw-alias-bg-skeleton': P('rgba(23,25,28,0.05)', 'rgba(230,232,235,0.07)'),
      '--dsw-alias-bg-mask-drop': P('rgba(255,255,255,0.72)', 'rgba(19,20,23,0.72)'),
      '--dsw-alias-border-l1': P('#E8EAED', '#2A2D33'),
      '--dsw-alias-border-l2': P('#E8EAED', '#2A2D33'),
      '--dsw-alias-border-l2-darkmode-thin': P('#E8EAED', '#2A2D33'),
      '--dsw-alias-border-l3': P('#E0E3E8', '#31353D'),
      '--dsw-alias-border-l4': P('#D8DCE1', '#3A3E46'),
      '--dsw-alias-brand-primary': P('#17191C', '#E6E8EB'),
      '--dsw-alias-brand-primary-invert': P('#FFFFFF', '#131417'),
      '--dsw-alias-brand-primary-new-colorprimary-new-color': P('#2E62D6', '#8CAAF2'),
      '--dsw-alias-brand-text': P('#17191C', '#E6E8EB'),
      '--dsw-alias-button-contrast-fill': P('#5B616B', '#9AA1AB'),
      '--dsw-alias-button-elevated-fill': P('#FFFFFF', '#1C1E22'),
      '--dsw-alias-button-floating-fill': P('#FFFFFF', '#1C1E22'),
      '--dsw-alias-button-floating-hover': P('#F5F6F7', '#24272D'),
      '--dsw-alias-button-ghost-active-border': P('#D8DCE1', '#3A3E46'),
      '--dsw-alias-button-ghost-active-fill': P('#E9EBF0', '#2E3138'),
      '--dsw-alias-button-ghost-active-hover': P('#E0E3E8', '#363A42'),
      '--dsw-alias-button-info-fill': P('#2E62D6', '#8CAAF2'),
      '--dsw-alias-button-info-hover': P('#2857BE', '#A2BCF4'),
      '--dsw-alias-button-primary-dimmed': P('#E9EBF0', '#2E3138'),
      '--dsw-alias-button-primary-fill': P('#17191C', '#E6E8EB'),
      '--dsw-alias-button-primary-hover': P('#33373E', '#FFFFFF'),
      '--dsw-alias-interactive-bg-active': P('rgba(46,98,214,0.16)', 'rgba(140,170,242,0.20)'),
      '--dsw-alias-interactive-bg-hover': P('rgba(23,25,28,0.05)', 'rgba(230,232,235,0.07)'),
      '--dsw-alias-interactive-bg-hover-accent': P('rgba(46,98,214,0.10)', 'rgba(140,170,242,0.14)'),
      '--dsw-alias-interactive-bg-hover-danger': P('rgba(185,28,28,0.06)', 'rgba(240,112,103,0.12)'),
      '--dsw-alias-interactive-bg-hover-solid': P('#E9EBF0', '#2E3138'),
      '--dsw-alias-label-caption': P('#9AA1AA', '#62686F'),
      '--dsw-alias-label-dimmed': P('#C2C8CF', '#43474E'),
      '--dsw-alias-label-primary': P('#17191C', '#E6E8EB'),
      '--dsw-alias-label-primary-bluish': P('#17191C', '#E6E8EB'),
      '--dsw-alias-label-primary-dimmed': P('#444A53', '#B9BEC6'),
      '--dsw-alias-label-primary-foreground': P('#FFFFFF', '#131417'),
      '--dsw-alias-label-primary-inverted': P('#FFFFFF', '#131417'),
      '--dsw-alias-label-secondary': P('#5B616B', '#9AA1AB'),
      '--dsw-alias-label-tertiary': P('#7E8590', '#8A9199'),
      '--dsw-alias-markdown-citation': P('#E9EBF0', '#2E3138'),
      '--dsw-alias-markdown-code-block-banner': P('#F5F6F7', '#24272D'),
      '--dsw-alias-markdown-code-block': P('#F5F6F7', '#1C1E22'),
      '--dsw-alias-markdown-code-segment-selected': P('#FFFFFF', '#2E3138'),
      '--dsw-alias-markdown-code-segment-unselected': P('#E9EBF0', '#26292F'),
      '--dsw-alias-markdown-inline-code': P('#E9EBF0', '#2E3138'),
      '--dsw-alias-markdown-placeholder': P('#9AA1AA', '#62686F'),
      '--dsw-alias-markdown-tag': P('#C2C8CF', '#43474E'),
      '--dsw-alias-scrollbar-bg-l1': P('#E0E3E8', '#43474E'),
      '--dsw-alias-scrollbar-bg-l2': P('#E0E3E8', '#43474E'),
      '--dsw-alias-scrollbar-hover-l1': P('#D8DCE1', '#52575F'),
      '--dsw-alias-scrollbar-hover-l2': P('#D8DCE1', '#52575F'),
      '--dsw-alias-state-business-primary': P('#2E62D6', '#8CAAF2'),
      '--dsw-alias-state-business-tertiary': P('#E9F0FD', '#1C2A44'),
      '--dsw-alias-state-error-primary': P('#B91C1C', '#F07067'),
      '--dsw-alias-state-error-secondary': P('#C63A32', '#F5928B'),
      '--dsw-alias-state-success-primary': P('#2F7D57', '#58B07F'),
      '--dsw-alias-state-success-secondary': P('#3F9C5A', '#74C795'),
      '--dsw-alias-state-success-tertiary': P('#EEF6F0', '#1A2B21'),
      '--dsw-alias-state-warn-label': P('#B45309', '#E8B04B'),
      '--dsw-alias-state-warn-primary': P('#B45309', '#E8B04B'),
      '--dsw-alias-state-warn-secondary': P('#C87A2A', '#F0C274'),
      '--dsw-alias-state-warn-tertiary': P('#FEF3C7', '#36280F'),
      '--dsw-alias-toast-bg': P('#17191C', '#26292F'),
      '--dsw-alias-tooltip-bg': P('#17191C', '#43474E'),
      '--dsw-specific-bubble': P('#E9EBF0', '#2E3138'),
      '--dsw-specific-bubble-highlight': P('#E0E3E8', '#363A42'),
      '--dsw-specific-input-major': P('#FFFFFF', '#1C1E22'),
      '--dsw-specific-login-input': P('#F5F6F7', '#23262B'),
      '--dsw-specific-menu': P('#FFFFFF', '#1C1E22'),
      '--dsw-specific-selector': P('#F5F6F7', '#26292F'),
      '--dsw-specific-sidebar-fill': P('#F5F6F7', '#131417'),
      '--dsw-specific-sidebar-nav-item-active': P('#E9EBF0', '#26292F'),
      '--dsw-specific-sidebar-nav-item-active-accent': P('#E9F0FD', '#1C2A44'),
      '--dsw-specific-sidebar-nav-item-hover': P('#EDEFF3', '#23262B'),
      '--dsw-specific-tip': P('#F5F6F7', '#23262B'),
    }

    const fonts = {
      '--dsw-font-family': P(
        "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif",
        "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif",
      ),
      '--ds-font-family-code': P(
        "'Geist Mono', 'SF Mono', 'JetBrains Mono', 'Fira Code', Consolas, 'Liberation Mono', Menlo, Courier, 'PingFang SC', 'Microsoft YaHei'",
        "'Geist Mono', 'SF Mono', 'JetBrains Mono', 'Fira Code', Consolas, 'Liberation Mono', Menlo, Courier, 'PingFang SC', 'Microsoft YaHei'",
      ),
    }

    const FONT_CSS = "@import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap');"
    const COCKPIT_CSS = [
      'body { letter-spacing: -0.005em; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }',
      ':root { --ds-transition-duration: 0.13s; --ds-transition-duration-fast: 0.09s; --ow-proto-focus: #2E62D6; }',
      'body[data-ds-dark-theme] { --ow-proto-focus: #8CAAF2; }',
      ':focus-visible { outline: 2px solid var(--ow-proto-focus); outline-offset: 1px; }',
    ].join('\n')

    const VARIANTS = [
      { id: 'base', short: 'DSH', hint: 'Текущий DSH без переопределений — база для сравнения' },
      { id: 'foundation', short: 'фундамент', hint: 'Заблокированный маппинг dsh-ood.4: цинковая рампа, один Cobalt, статусы-квады, нейтральный баббл' },
      { id: 'geist', short: '+Geist', hint: 'Фундамент + Geist и Geist Mono (CDN; в продакшене — self-hosted woff2)' },
      { id: 'cockpit', short: '+плотность', hint: 'Geist + зонд плотности: трекинг, сглаживание, motion 130ms, кобальтовый focus-ring' },
    ]

    let undoLayer = () => {}
    let undoFonts = () => {}
    let undoCockpit = () => {}

    const applyVariant = (id) => {
      undoLayer(); undoLayer = () => {}
      undoFonts(); undoFonts = () => {}
      undoCockpit(); undoCockpit = () => {}
      if (id === 'base') return
      const tokens = Object.assign({}, colors)
      if (id === 'geist' || id === 'cockpit') {
        Object.assign(tokens, fonts)
        undoFonts = styles.insert(FONT_CSS)
      }
      if (id === 'cockpit') undoCockpit = styles.insert(COCKPIT_CSS)
      undoLayer = theme.overrideTokens(SOURCE, tokens)
    }

    ctx.effect(() => () => {
      undoLayer(); undoFonts(); undoCockpit()
    })

    function OwBar(barProps) {
      const variants = barProps.variants
      const initial = barProps.initial
      const onSelect = barProps.onSelect
      const state = React.useState(initial)
      const current = state[0]
      const setCurrent = state[1]
      const select = (id) => { setCurrent(id); onSelect(id) }
      const chip = (v) => React.createElement('button', {
        key: v.id,
        onClick: () => select(v.id),
        title: v.hint,
        style: {
          border: 'none', cursor: 'pointer', borderRadius: '9999px',
          padding: '4px 10px', fontSize: '12px', lineHeight: '1.4',
          background: current === v.id ? '#FFFFFF' : 'transparent',
          color: current === v.id ? '#111317' : 'rgba(255,255,255,0.8)',
          fontWeight: current === v.id ? 600 : 400,
        },
      }, v.short)
      return React.createElement('div', {
        style: {
          position: 'fixed', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: '4px',
          background: 'rgba(17,19,22,0.92)', color: '#FFFFFF',
          borderRadius: '9999px', padding: '6px 8px 6px 14px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          userSelect: 'none', zIndex: 50, maxWidth: '92vw',
        },
      },
        React.createElement('span', { style: { opacity: 0.65, marginRight: '4px', fontSize: '11px' } }, 'OW'),
        variants.map(chip),
      )
    }

    slots.inject('shell.overlay', () => slots.register(
      {
        name: 'shell.overlay',
        id: 'ow-proto-bar',
        inject: () => ({ variants: VARIANTS, initial: 'foundation', onSelect: applyVariant }),
      },
      OwBar,
    ))

    applyVariant('foundation')
  },
}
