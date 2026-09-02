import React from 'react';
import ConfirmDialog from './ConfirmDialog';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  variant?: 'danger' | 'primary';
}

const useConfirmDialog = () => {
  const [options, setOptions] = React.useState<ConfirmOptions | null>(null);
  const resolver = React.useRef<((confirmed: boolean) => void) | null>(null);

  const finish = React.useCallback((confirmed: boolean) => {
    resolver.current?.(confirmed);
    resolver.current = null;
    setOptions(null);
  }, []);

  const confirm = React.useCallback((nextOptions: ConfirmOptions) => new Promise<boolean>((resolve) => {
    resolver.current?.(false);
    resolver.current = resolve;
    setOptions(nextOptions);
  }), []);

  React.useEffect(() => () => resolver.current?.(false), []);

  const confirmDialog = options ? (
    <ConfirmDialog
      isOpen
      title={options.title}
      description={options.description}
      confirmText={options.confirmText}
      variant={options.variant}
      onClose={() => finish(false)}
      onConfirm={() => finish(true)}
    />
  ) : null;

  return { confirm, confirmDialog };
};

export default useConfirmDialog;
