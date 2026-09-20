import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { DropdownSelect } from './DropdownSelect';

const options = [
  { value: '', label: '全部状态' },
  { value: 'DRAFT', label: '私有草稿' },
  { value: 'PUBLISHED', label: '已发布' },
] as const;

describe('shared dropdown', () => {
  it('opens with the current option and selects using arrow keys and Enter', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DropdownSelect label="状态筛选" value="DRAFT" options={options} onChange={onChange} />);
    const trigger = screen.getByRole('button', { name: '状态筛选' });

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('option', { name: '私有草稿' })).toHaveFocus();
    expect(screen.getByRole('option', { name: '私有草稿' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await user.keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledWith('PUBLISHED');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('restores focus on Escape and closes on outside click', async () => {
    const user = userEvent.setup();
    render(
      <>
        <DropdownSelect label="状态筛选" value="" options={options} onChange={vi.fn()} />
        <button type="button">页面操作</button>
      </>,
    );
    const trigger = screen.getByRole('button', { name: '状态筛选' });
    await user.click(trigger);
    await user.keyboard('{End}{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: '页面操作' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens upward when the trigger is near the bottom of the viewport', async () => {
    const measure = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        if (this.getAttribute('aria-haspopup') === 'listbox') return new DOMRect(0, 720, 180, 40);
        if (this.getAttribute('role') === 'listbox') return new DOMRect(0, 767, 180, 150);
        return new DOMRect();
      });
    try {
      render(<DropdownSelect label="状态筛选" value="" options={options} onChange={vi.fn()} />);
      await userEvent.click(screen.getByRole('button', { name: '状态筛选' }));
      expect(screen.getByRole('listbox', { name: '状态筛选' }).parentElement).toHaveAttribute(
        'data-placement',
        'above',
      );
    } finally {
      measure.mockRestore();
    }
  });
});
