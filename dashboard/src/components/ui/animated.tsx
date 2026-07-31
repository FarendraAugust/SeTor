'use client'

import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

interface AnimationProps extends HTMLAttributes<HTMLDivElement> {
  delay?: number
}

export function FadeIn({ children, className, delay, ...props }: AnimationProps) {
  return (
    <div
      className={cn('animate-fade-in', className)}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      {...props}
    >
      {children}
    </div>
  )
}

export function SlideUp({ children, className, delay, ...props }: AnimationProps) {
  return (
    <div
      className={cn('animate-slide-up', className)}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      {...props}
    >
      {children}
    </div>
  )
}

interface StaggerProps extends HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType
  delay?: number
  staggerDelay?: number
}

export function Stagger({
  children,
  className,
  as: Component = 'div',
  delay = 0,
  staggerDelay = 80,
  ...props
}: StaggerProps) {
  return (
    <Component className={cn('flex flex-col', className)} {...props}>
      {(Array.isArray(children) ? children : [children]).map((child, i) => (
        <div
          key={i}
          className="animate-slide-up"
          style={{ animationDelay: `${delay + i * staggerDelay}ms` }}
        >
          {child}
        </div>
      ))}
    </Component>
  )
}
