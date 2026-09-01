import { render, screen } from '@testing-library/react'
import type { ReactNode, Ref } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { KebabAction } from './SynKebabMenu'

type DropdownProps = {
  toggle?: (ref: Ref<HTMLButtonElement>) => ReactNode
  children?: ReactNode
  isOpen?: boolean
}

/**
 * PatternFly Dropdown normally supplies a callback ref. This mock supplies an
 * object ref instead so SynKebabMenu's object-ref branch is exercised.
 */
vi.mock('@patternfly/react-core', async () => {
  const actual = await vi.importActual<typeof import('@patternfly/react-core')>('@patternfly/react-core')
  return {
    ...actual,
    Dropdown: ({ toggle, children, isOpen }: DropdownProps) => {
      const objectRef = { current: null as HTMLButtonElement | null }
      return (
        <div>
          {typeof toggle === 'function' ? toggle(objectRef) : null}
          {isOpen ? children : null}
        </div>
      )
    },
  }
})

describe('SynKebabMenu object ref bridge', () => {
  it('renders the toggle when Dropdown provides an object ref', async () => {
    const { SynKebabMenu } = await import('./SynKebabMenu')
    const actions: KebabAction[] = [{ key: 'edit', title: 'Edit', onClick: vi.fn() }]

    render(<SynKebabMenu actions={actions} aria-label="Row actions" />)

    expect(screen.getByRole('button', { name: 'Row actions' })).toBeInTheDocument()
  })
})
