declare module '@radix-ui/react-toggle-group' {
  import * as React from 'react';

  // Root
  interface RootProps extends React.HTMLAttributes<HTMLDivElement> {
    type?: 'single' | 'multiple';
    defaultValue?: string | string[];
    value?: string | string[];
    onValueChange?: (value: string | string[]) => void;
    disabled?: boolean;
    rovingFocus?: boolean;
    orientation?: 'horizontal' | 'vertical';
    dir?: 'ltr' | 'rtl';
    loop?: boolean;
    children?: React.ReactNode;
  }
  const Root: React.ForwardRefExoticComponent<
    RootProps & React.RefAttributes<HTMLDivElement>
  >;

  // Item
  interface ItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    value: string;
    disabled?: boolean;
    children?: React.ReactNode;
  }
  const Item: React.ForwardRefExoticComponent<
    ItemProps & React.RefAttributes<HTMLButtonElement>
  >;
}
