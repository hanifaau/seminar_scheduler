'use client';

import * as React from 'react';
import { Badge } from '@/components/atoms/Badge';
import { cn } from '@/lib/utils';

interface LecturerCardProps {
  name: string;
  nip: string;
  expertise: string[];
  status?: string;
  className?: string;
  onClick?: () => void;
}

const LecturerCard = React.forwardRef<HTMLDivElement, LecturerCardProps>(
  ({ name, nip, expertise, status, className, onClick }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border bg-card p-4 text-card-foreground shadow-sm transition-colors hover:bg-accent/50',
          onClick && 'cursor-pointer',
          className
        )}
        onClick={onClick}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-lg">{name}</h3>
            <p className="text-sm text-muted-foreground">{nip}</p>
          </div>
          {status && (
            <Badge
              variant={
                status === 'active'
                  ? 'success'
                  : status === 'on leave'
                  ? 'warning'
                  : 'secondary'
              }
            >
              {status}
            </Badge>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {expertise.map((exp, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {exp}
            </Badge>
          ))}
        </div>
      </div>
    );
  }
);
LecturerCard.displayName = 'LecturerCard';

export { LecturerCard };
