declare module '@radix-ui/react-toast' {
  import * as React from 'react';

  // Provider
  interface ProviderProps {
    duration?: number;
    children?: React.ReactNode;
    swipeDirection?: 'right' | 'left' | 'up' | 'down';
    label?: string;
  }
  const Provider: React.FC<ProviderProps>;

  // Viewport
  interface ViewportProps extends React.HTMLAttributes<HTMLOListElement> {
    children?: React.ReactNode;
    label?: string;
  }
  const Viewport: React.ForwardRefExoticComponent<
    ViewportProps & React.RefAttributes<HTMLOListElement>
  >;

  // Root
  interface ToastProps extends React.HTMLAttributes<HTMLLIElement> {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?(open: boolean): void;
    type?: string;
    duration?: number;
    forceMount?: boolean;
    altText?: string;
    children?: React.ReactNode;
  }
  const Root: React.ForwardRefExoticComponent<
    ToastProps & React.RefAttributes<HTMLLIElement>
  >;

  // Action
  interface ActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    altText?: string;
    children?: React.ReactNode;
  }
  const Action: React.ForwardRefExoticComponent<
    ActionProps & React.RefAttributes<HTMLButtonElement>
  >;

  // Close
  interface CloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children?: React.ReactNode;
  }
  const Close: React.ForwardRefExoticComponent<
    CloseProps & React.RefAttributes<HTMLButtonElement>
  >;

  // Title
  interface TitleProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode;
  }
  const Title: React.ForwardRefExoticComponent<
    TitleProps & React.RefAttributes<HTMLDivElement>
  >;

  // Description
  interface DescriptionProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode;
  }
  const Description: React.ForwardRefExoticComponent<
    DescriptionProps & React.RefAttributes<HTMLDivElement>
  >;
}
