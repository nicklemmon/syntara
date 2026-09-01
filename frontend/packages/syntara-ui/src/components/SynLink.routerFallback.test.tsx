import { render, screen } from '@testing-library/react'
import type { ComponentProps, ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

type ButtonProps = {
  component?: React.ElementType
  children?: ReactNode
  href?: string
  className?: string
  onClick?: ComponentProps<'button'>['onClick']
}

vi.mock('@patternfly/react-core', async () => {
  const actual = await vi.importActual<typeof import('@patternfly/react-core')>('@patternfly/react-core')
  return {
    ...actual,
    Button: ({ component: Comp, children, ...rest }: ButtonProps) => {
      if (!Comp) return <button type="button">{children}</button>
      // Omit href so RouterLink must apply its defensive `/` fallback.
      // Strip PF-only props that would otherwise land on the DOM bridge element.
      const {
        href: _href,
        isInline: _isInline,
        variant: _variant,
        ...bridgeProps
      } = rest as ButtonProps & { isInline?: boolean; variant?: string }
      return <Comp {...bridgeProps}>{children}</Comp>
    },
  }
})

describe('SynLink router fallback', () => {
  it('falls back to / when the PatternFly bridge omits href', async () => {
    const { SynLink } = await import('./SynLink')
    render(<SynLink to="/workflows">Workflows</SynLink>)

    expect(screen.getByRole('link', { name: 'Workflows' })).toHaveAttribute('href', '/')
  })
})
