'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import dynamic from 'next/dynamic';
import "swagger-ui-react/swagger-ui.css"; // Default Swagger UI styles

// Dynamically import SwaggerUI to handle client-side only rendering
// This also helps with handling import errors
const SwaggerUI = dynamic(() => import('swagger-ui-react').catch(() => () => (
  <div className="p-8 text-center">
    <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-4" />
    <h3 className="text-lg font-bold mb-2">Swagger UI Failed to Load</h3>
    <p className="text-muted-foreground mb-4">There was an error loading the API documentation component.</p>
    <Button onClick={() => window.location.reload()}>
      <RefreshCw className="w-4 h-4 mr-2" /> Reload Page
    </Button>
  </div>
)), {
  ssr: false,
  loading: () => <div className="p-8 text-center text-muted-foreground">Loading API Documentation...</div>
});

// Create an error boundary component
class SwaggerErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error in Swagger UI:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">Failed to Load API Documentation</h3>
          <p className="text-muted-foreground mb-4">
            There was an error loading the API documentation. This may be due to a version mismatch in the Swagger UI components.
          </p>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Reload Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function ApiDocsPage() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // URL for your OpenAPI specification
  const specUrl = "/openapi.yaml"; 

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">API Documentation</h1>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="bg-card rounded-lg shadow-md">
            {isClient ? (
              <SwaggerErrorBoundary>
                <div className="swagger-ui-wrapper">
                  <SwaggerUI
                    url={specUrl}
                    tryItOutEnabled={true}
                    supportedSubmitMethods={["get", "post", "put", "delete", "patch"]}
                  />
                </div>
              </SwaggerErrorBoundary>
            ) : (
              <div className="p-8 text-center text-muted-foreground">Loading API Documentation...</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}