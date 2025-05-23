"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListChecks, Clock, AlertTriangle, ArrowRight, CalendarCheck2, RefreshCw } from "lucide-react";
import type { Task } from '@/components/tasks/TaskItem';
import { format, isToday, isPast, addDays, parseISO, isValid } from 'date-fns';
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useQuery } from '@tanstack/react-query';
import { fetchTasks } from '@/lib/api/tasks';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from "@/hooks/use-toast"; // Use existing toast implementation

export default function DashboardPage() {
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast(); // Get the toast function from the hook

  useEffect(() => {
    setIsClient(true);
  }, []);

  const { data: tasks = [], isLoading, isError, error, refetch } = useQuery<Task[], Error>({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
  });

  // Calculations need to happen after data is available and client is mounted for date consistency
  const [summaryStats, setSummaryStats] = useState({
    tasksDueToday: 0,
    tasksInProgress: 0,
    overdueTasks: 0,
  });
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (tasks.length > 0 && isClient) {
      const now = new Date();
      setSummaryStats({
        tasksDueToday: tasks.filter(task => task.dueDate && isValid(parseISO(task.dueDate)) && isToday(parseISO(task.dueDate)) && task.status !== 'Done').length,
        tasksInProgress: tasks.filter(task => task.status === 'In Progress').length,
        overdueTasks: tasks.filter(task => task.dueDate && isValid(parseISO(task.dueDate)) && isPast(parseISO(task.dueDate)) && !isToday(parseISO(task.dueDate)) && task.status !== 'Done').length,
      });
      setUpcomingTasks(
        tasks
          .filter(task => {
            if (!task.dueDate || task.status === 'Done') return false;
            const dueDate = parseISO(task.dueDate);
            return isValid(dueDate) && dueDate >= now && dueDate < addDays(now, 7);
          })
          .sort((a, b) => {
            const dateA = a.dueDate ? parseISO(a.dueDate).getTime() : 0;
            const dateB = b.dueDate ? parseISO(b.dueDate).getTime() : 0;
            return dateA - dateB;
           })
          .slice(0, 5)
      );
    }
  }, [tasks, isClient]);


  const summaryCardsData = [
    { title: "Tasks Due Today", valueKey: 'tasksDueToday' as const, icon: CalendarCheck2, color: "text-blue-500", href: "/tasks?filter=dueToday" },
    { title: "Tasks In Progress", valueKey: 'tasksInProgress' as const, icon: Clock, color: "text-yellow-500", href: "/tasks?filter=inProgress" },
    { title: "Overdue Tasks", valueKey: 'overdueTasks' as const, icon: AlertTriangle, color: "text-red-500", href: "/tasks?filter=overdue" },
  ];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const reason = params.get('reason');
    
    if (error === 'forbidden') {
      toast({
        title: "Access Denied",
        description: reason || "You don't have permission to access the admin area.",
        variant: "destructive",
      });
      
      // Clean up URL after showing toast
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      url.searchParams.delete('reason');
      window.history.replaceState({}, document.title, url.toString());
    }
  }, [toast]); // Add toast to dependency array

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-9 w-1/3 mb-2 rounded-md" />
          <Skeleton className="h-5 w-1/2 rounded-md" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {summaryCardsData.map((card, i) => (
            <Card key={i} className="shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-5 w-2/3 rounded-md" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-1/4 mt-1 rounded-md" />
                <Skeleton className="h-4 w-1/2 mt-2 rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-7 w-1/2 mb-1 rounded-md" />
            <Skeleton className="h-4 w-3/4 rounded-md" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
     return (
      <div className="space-y-6 text-center p-8 max-w-2xl mx-auto">
        <AlertTriangle className="mx-auto h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-destructive">Failed to load dashboard data</h2>
        <p className="text-muted-foreground text-lg mt-2">
            {error?.message || "An unexpected error occurred while trying to fetch task data for the dashboard."}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
            Please check your connection or try again later.
        </p>
        <Button onClick={() => refetch()} variant="outline" className="mt-6 text-base py-2 px-4">
          <RefreshCw className="mr-2 h-5 w-5" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's a summary of your tasks.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {summaryCardsData.map((card) => (
          <Card key={card.title} className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={cn("h-5 w-5 text-muted-foreground", card.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{summaryStats[card.valueKey]}</div>
              <p className="text-xs text-muted-foreground pt-1">
                {card.title.toLowerCase().includes("due") ? "tasks" : 
                 card.title.toLowerCase().includes("overdue") ? "tasks overdue" : 
                 card.title.toLowerCase().includes("in progress") ? "currently in progress" : "information"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-primary" />
            Upcoming Tasks (Next 7 Days)
          </CardTitle>
          <CardDescription>Tasks that are due soon. Stay on top of your schedule!</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingTasks.length > 0 ? (
            <ul className="space-y-3">
              {upcomingTasks.map((task) => (
                <li key={task.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                  <div>
                    <Link href={`/tasks/view/${task.id}`} className="font-medium text-primary hover:underline break-words">
                      {task.title}
                    </Link>
                    {task.dueDate && (
                      <p className="text-xs text-muted-foreground">
                        Due: {isClient && task.dueDate && isValid(parseISO(task.dueDate)) ? format(parseISO(task.dueDate), 'EEE, MMM d, yyyy') : '...'}
                      </p>
                    )}
                  </div>
                  <Link href={`/tasks/view/${task.id}`}>
                    <Button variant="ghost" size="sm" className="mt-2 sm:mt-0">
                      View Task <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-center py-4">No upcoming tasks in the next 7 days. Great job or time to plan!</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
