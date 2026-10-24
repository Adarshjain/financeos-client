import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { showToast } from '@/components/ds/Toast/Toast';
import { notify } from '@/lib/notify';
import { markDineroToaster } from '@/lib/toastTarget';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(() => 's'),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    message: vi.fn(),
    loading: vi.fn(() => 'load-1'),
    dismiss: vi.fn(),
  },
}));
vi.mock('@/components/ds/Toast/Toast', () => ({ showToast: vi.fn(() => 'ds-id') }));

describe('notify without a Dinero toaster', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls sonner with the same arguments', () => {
    notify.success('ok', { id: 'x' });
    notify.error('bad');
    notify.info('fyi', { id: 'x' });
    notify.warning('hmm');
    notify.message('plain');
    expect(toast.success).toHaveBeenCalledWith('ok', { id: 'x' });
    expect(toast.error).toHaveBeenCalledWith('bad');
    expect(toast.info).toHaveBeenCalledWith('fyi', { id: 'x' });
    expect(toast.warning).toHaveBeenCalledWith('hmm');
    expect(toast.message).toHaveBeenCalledWith('plain');
    expect(showToast).not.toHaveBeenCalled();
  });

  it('returns the sonner loading id and dismisses through sonner', () => {
    expect(notify.loading('Uploading')).toBe('load-1');
    notify.dismiss('load-1');
    expect(toast.dismiss).toHaveBeenCalledWith('load-1');
  });
});

describe('notify with a Dinero toaster mounted', () => {
  let unmount: () => void;
  beforeEach(() => {
    vi.clearAllMocks();
    unmount = markDineroToaster();
  });
  afterEach(() => unmount());

  it('maps each kind to a showToast tone', () => {
    notify.success('a');
    notify.error('b');
    notify.info('c');
    notify.warning('d');
    notify.message('e');
    const tones = vi.mocked(showToast).mock.calls.map((c) => c[1]?.tone);
    expect(tones).toEqual(['success', 'danger', 'info', 'warning', 'neutral']);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('loading stays until replaced, and an id update reuses the same toast', () => {
    const id = notify.loading('Uploading');
    expect(showToast).toHaveBeenLastCalledWith('Uploading', expect.objectContaining({ duration: Infinity }));
    notify.info('Done', { id });
    expect(showToast).toHaveBeenLastCalledWith('Done', expect.objectContaining({ id: 'ds-id', tone: 'info' }));
  });

  it('carries duration, description and the action', () => {
    const onClick = vi.fn();
    notify.error('Failed', { duration: 8000, description: 'Ref abc', action: { label: 'Copy ID', onClick } });
    const [message, opts] = vi.mocked(showToast).mock.calls[0];
    expect(message).toBe('Failed (Ref abc)');
    expect(opts?.duration).toBe(8000);
    expect(opts?.action?.label).toBe('Copy ID');
    opts?.action?.onSelect();
    expect(onClick).toHaveBeenCalled();
  });

  it('stops routing to Dinero once the toaster unmounts', () => {
    unmount();
    notify.success('late');
    expect(toast.success).toHaveBeenCalledWith('late');
    unmount = markDineroToaster();
  });
});
