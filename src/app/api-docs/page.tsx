'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css"; // Default Swagger UI styles

export default function ApiDocsPage() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // URL for your OpenAPI specification.
  // This now points to the file in the public directory.
  const specUrl = "/openapi.yaml"; 

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">API Documentation</h1>
      <Card>
        <CardContent className="space-y-4 pt-6"> {/* Added pt-6 for consistency with other cards */}
          <div className="bg-card rounded-lg shadow-md">
            {isClient ? (
              <SwaggerUI url={specUrl} />
            ) : (
              <div className="p-8 text-center text-muted-foreground">Loading API Documentation...</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}