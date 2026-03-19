# ToolBar Refactor & Testing Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the 269-line ToolBar component into smaller, testable pieces and write comprehensive tests using bun:test.

**Architecture:** Extract button rendering logic into a reusable `ToolBarButton` component, extract the animated menu container into `ToolBarMenu`, and extract the app bar button row into `ToolBarAppBar`. This reduces the main ToolBar from 269 lines to ~100 lines focused on orchestration and state management.

**Tech Stack:** React 19, bun:test, @testing-library/react, TypeScript, Framer Motion

---

## File Structure

### New Files to Create
- `packages/web/src/components/ToolBar/ToolBarButton/index.tsx` - Reusable toolbar button component
- `packages/web/src/components/ToolBar/ToolBarButton/index.test.tsx` - Button tests
- `packages/web/src/components/ToolBar/ToolBarMenu/index.tsx` - Animated menu container
- `packages/web/src/components/ToolBar/ToolBarMenu/index.test.tsx` - Menu tests
- `packages/web/src/components/ToolBar/ToolBarAppBar/index.tsx` - App bar button row
- `packages/web/src/components/ToolBar/ToolBarAppBar/index.test.tsx` - App bar tests
- `packages/web/src/hooks/useToolBarMenuPosition.test.ts` - Menu positioning hook tests

### Files to Modify
- `packages/web/src/components/ToolBar/index.tsx` - Refactor to use extracted pieces

---

## Phase 1: Create ToolBarButton Component

### Task 1: Extract reusable button component with tests

**Files:**
- Create: `packages/web/src/components/ToolBar/ToolBarButton/index.tsx`
- Create: `packages/web/src/components/ToolBar/ToolBarButton/index.test.tsx`

- [ ] **Step 1: Write test file for ToolBarButton**

```typescript
import { GlobalRegistrator } from '@happy-dom/global-registrator';
try {
    GlobalRegistrator.register();
} catch {
    // Already registered
}

import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { ToolBarButton } from './index';
import { cleanup } from '@testing-library/react';

describe('ToolBarButton', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders button with icon', () => {
        const TestIcon = () => <span>icon</span>;
        const { getByRole } = render(
            <ToolBarButton icon={TestIcon} title="Test" onClick={() => {}} />
        );

        expect(getByRole('button')).toBeInTheDocument();
        expect(getByRole('button')).toHaveAttribute('title', 'Test');
    });

    it('calls onClick handler when clicked', async () => {
        const user = userEvent.setup();
        const onClick = mock.fn();
        const TestIcon = () => <span>icon</span>;
        const { getByRole } = render(
            <ToolBarButton icon={TestIcon} title="Test" onClick={onClick} />
        );

        await user.click(getByRole('button'));
        expect(onClick).toHaveBeenCalled();
    });

    it('disables button when disabled prop is true', () => {
        const TestIcon = () => <span>icon</span>;
        const { getByRole } = render(
            <ToolBarButton icon={TestIcon} title="Test" onClick={() => {}} disabled={true} />
        );

        expect(getByRole('button')).toBeDisabled();
    });

    it('applies variant styling', () => {
        const TestIcon = () => <span>icon</span>;
        const { container } = render(
            <ToolBarButton icon={TestIcon} title="Test" onClick={() => {}} variant="destructive" />
        );

        const button = container.querySelector('button');
        expect(button).toHaveClass('text-destructive');
    });

    it('applies ripple effect class', () => {
        const TestIcon = () => <span>icon</span>;
        const { container } = render(
            <ToolBarButton icon={TestIcon} title="Test" onClick={() => {}} rippleClassName="bg-red-500/30" />
        );

        const button = container.querySelector('button');
        expect(button).toBeTruthy();
    });
});
```

- [ ] **Step 2: Create ToolBarButton component**

```typescript
import React, { forwardRef } from 'react';
import { RippleButton } from '@/components/ui/ripple';

interface ToolBarButtonProps {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    onClick: () => void;
    disabled?: boolean;
    variant?: 'default' | 'destructive';
    rippleClassName?: string;
}

export const ToolBarButton = forwardRef<HTMLButtonElement, ToolBarButtonProps>(
    ({ icon: Icon, title, onClick, disabled = false, variant = 'default', rippleClassName = 'bg-gray-500/30' }, ref) => {
        const isDestructive = variant === 'destructive';

        return (
            <RippleButton
                ref={ref}
                size="icon"
                variant="ghost"
                className={`h-12 w-12 rounded-full transition-colors ${isDestructive ? 'text-destructive hover:bg-destructive/10' : ''}`}
                rippleClassName={rippleClassName}
                title={title}
                onClick={onClick}
                disabled={disabled}
            >
                <Icon className="size-5" />
            </RippleButton>
        );
    }
);

ToolBarButton.displayName = 'ToolBarButton';
```

- [ ] **Step 3: Run tests**

```bash
bun test packages/web/src/components/ToolBar/ToolBarButton/index.test.tsx
```

Expected: All tests pass ✅

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/ToolBar/ToolBarButton/
git commit -m "feat: extract ToolBarButton reusable component with tests"
```

---

## Phase 2: Create ToolBarMenu Component

### Task 2: Extract animated menu container with tests

**Files:**
- Create: `packages/web/src/components/ToolBar/ToolBarMenu/index.tsx`
- Create: `packages/web/src/components/ToolBar/ToolBarMenu/index.test.tsx`

- [ ] **Step 1: Write test file for ToolBarMenu**

```typescript
import { GlobalRegistrator } from '@happy-dom/global-registrator';
try {
    GlobalRegistrator.register();
} catch {
    // Already registered
}

import '@testing-library/jest-dom';
import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'bun:test';
import { ToolBarMenu } from './index';

describe('ToolBarMenu', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders closed menu with no content visible', () => {
        const { container } = render(
            <ToolBarMenu isOpen={false} contentHeight={0}>
                <div>Menu Content</div>
            </ToolBarMenu>
        );

        const menu = container.querySelector('[class*="overflow-hidden"]');
        expect(menu).toBeInTheDocument();
    });

    it('renders divider when menu is open', () => {
        const { container } = render(
            <ToolBarMenu isOpen={true} contentHeight={200}>
                <div>Menu Content</div>
            </ToolBarMenu>
        );

        const divider = container.querySelector('[class*="bg-gradient-to-r"]');
        expect(divider).toBeInTheDocument();
    });

    it('does not render divider when menu is closed', () => {
        const { container } = render(
            <ToolBarMenu isOpen={false} contentHeight={0}>
                <div>Menu Content</div>
            </ToolBarMenu>
        );

        const divider = container.querySelector('[class*="bg-gradient-to-r"]');
        expect(divider).not.toBeInTheDocument();
    });

    it('renders children content', () => {
        const { getByText } = render(
            <ToolBarMenu isOpen={true} contentHeight={200}>
                <div>Test Content</div>
            </ToolBarMenu>
        );

        expect(getByText('Test Content')).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Create ToolBarMenu component**

```typescript
import { AnimatePresence, motion } from 'motion/react';
import { Card } from '@/components/ui/card';
import React from 'react';

interface ToolBarMenuProps {
    isOpen: boolean;
    contentHeight: number;
    children: React.ReactNode;
    maxWidth?: number;
}

const transition = {
    type: 'spring' as const,
    bounce: 0.1,
    duration: 0.25,
};

export const ToolBarMenu = ({ isOpen, contentHeight, children, maxWidth = 0 }: ToolBarMenuProps) => {
    return (
        <Card className="shadow-xl py-0 !gap-0 backdrop-blur-sm border border-slate-200/50 relative z-10">
            {/* Menu Content with Staggered Animation */}
            <div className="overflow-hidden">
                <AnimatePresence initial={false} mode="sync">
                    {isOpen ? (
                        <motion.div
                            key="content"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: contentHeight || 0, opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{
                                height: { duration: 0.3 },
                                opacity: { duration: 0.2 },
                            }}
                            style={{ width: maxWidth }}
                        >
                            <div className="px-3 py-4">{children}</div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>

            {/* Visual Separator - Divider Line */}
            {isOpen && <div className="h-0.5 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />}
        </Card>
    );
};
```

- [ ] **Step 3: Run tests**

```bash
bun test packages/web/src/components/ToolBar/ToolBarMenu/index.test.tsx
```

Expected: All tests pass ✅

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/ToolBar/ToolBarMenu/
git commit -m "feat: extract ToolBarMenu animated container with tests"
```

---

## Phase 3: Create ToolBarAppBar Component

### Task 3: Extract app bar button row with tests

**Files:**
- Create: `packages/web/src/components/ToolBar/ToolBarAppBar/index.tsx`
- Create: `packages/web/src/components/ToolBar/ToolBarAppBar/index.test.tsx`

- [ ] **Step 1: Write test file for ToolBarAppBar**

```typescript
import { GlobalRegistrator } from '@happy-dom/global-registrator';
try {
    GlobalRegistrator.register();
} catch {
    // Already registered
}

import '@testing-library/jest-dom';
import { render, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, afterEach, mock } from 'bun:test';
import { ToolBarAppBar } from './index';

describe('ToolBarAppBar', () => {
    afterEach(() => {
        cleanup();
    });

    it('renders back button when on items page', () => {
        const { getByTitle } = render(
            <ToolBarAppBar
                isItemsPage={true}
                isListsPage={false}
                onBack={() => {}}
                onMenuToggle={() => {}}
            />
        );

        expect(getByTitle(/go back|go home/i)).toBeInTheDocument();
    });

    it('does not render back button on lists page', () => {
        const { queryByTitle } = render(
            <ToolBarAppBar
                isItemsPage={false}
                isListsPage={true}
                onBack={() => {}}
                onMenuToggle={() => {}}
            />
        );

        expect(queryByTitle(/go back|go home/i)).not.toBeInTheDocument();
    });

    it('renders menu button', () => {
        const { getByTitle } = render(
            <ToolBarAppBar
                isItemsPage={false}
                isListsPage={false}
                onBack={() => {}}
                onMenuToggle={() => {}}
            />
        );

        expect(getByTitle('Menu')).toBeInTheDocument();
    });

    it('calls onMenuToggle when menu button is clicked', async () => {
        const user = userEvent.setup();
        const onMenuToggle = mock.fn();
        const { getByTitle } = render(
            <ToolBarAppBar
                isItemsPage={false}
                isListsPage={false}
                onBack={() => {}}
                onMenuToggle={onMenuToggle}
            />
        );

        await user.click(getByTitle('Menu'));
        expect(onMenuToggle).toHaveBeenCalled();
    });

    it('renders add item button when on items page', () => {
        const { getByRole } = render(
            <ToolBarAppBar
                isItemsPage={true}
                isListsPage={false}
                onBack={() => {}}
                onMenuToggle={() => {}}
                onAddItemClick={() => {}}
            />
        );

        // Check for plus button or add item button representation
        expect(getByRole('button', { hidden: true })).toBeInTheDocument();
    });

    it('renders clear selected button when handler provided', () => {
        const { getByTitle } = render(
            <ToolBarAppBar
                isItemsPage={true}
                isListsPage={false}
                onBack={() => {}}
                onMenuToggle={() => {}}
                onClearSelected={() => {}}
            />
        );

        expect(getByTitle('Clear selected items')).toBeInTheDocument();
    });

    it('disables clear selected button when disableClearSelected is true', () => {
        const { getByTitle } = render(
            <ToolBarAppBar
                isItemsPage={true}
                isListsPage={false}
                onBack={() => {}}
                onMenuToggle={() => {}}
                onClearSelected={() => {}}
                disableClearSelected={true}
            />
        );

        expect(getByTitle('Clear selected items')).toBeDisabled();
    });

    it('renders remove all button when handler provided', () => {
        const { getByTitle } = render(
            <ToolBarAppBar
                isItemsPage={true}
                isListsPage={false}
                onBack={() => {}}
                onMenuToggle={() => {}}
                onRemoveAll={() => {}}
            />
        );

        expect(getByTitle('Remove all items')).toBeInTheDocument();
    });

    it('disables remove all button when disableClearAll is true', () => {
        const { getByTitle } = render(
            <ToolBarAppBar
                isItemsPage={true}
                isListsPage={false}
                onBack={() => {}}
                onMenuToggle={() => {}}
                onRemoveAll={() => {}}
                disableClearAll={true}
            />
        );

        expect(getByTitle('Remove all items')).toBeDisabled();
    });
});
```

- [ ] **Step 2: Create ToolBarAppBar component**

```typescript
import { ArrowLeft, CheckCheck, Menu, Trash2 } from 'lucide-react';
import { CardContent } from '@/components/ui/card';
import { ToolBarButton } from '../ToolBarButton';
import { AddItemDrawer } from '../AddItemDrawer';
import { AddListDrawer } from '../AddListDrawer';
import type { ListType } from '@shoppingo/types';

interface ToolBarAppBarProps {
    isItemsPage: boolean;
    isListsPage: boolean;
    onBack: () => void;
    onMenuToggle: () => void;
    onClearSelected?: () => void;
    onRemoveAll?: () => void;
    onAddItemClick?: (open: boolean) => void;
    onAddListClick?: (open: boolean) => void;
    disableClearSelected?: boolean;
    disableClearAll?: boolean;
    currentListType?: ListType;
    placeholder?: string;
    isAddItemDrawerOpen?: boolean;
    isAddListDrawerOpen?: boolean;
    onAddItem?: (name: string, quantity?: number, unit?: string, dueDate?: Date) => Promise<void>;
    onAddList?: (name: string, listType: ListType, users: string[]) => Promise<void>;
}

export const ToolBarAppBar = ({
    isItemsPage,
    isListsPage,
    onBack,
    onMenuToggle,
    onClearSelected,
    onRemoveAll,
    onAddItemClick,
    onAddListClick,
    disableClearSelected = false,
    disableClearAll = false,
    currentListType,
    placeholder = 'Enter item name...',
    isAddItemDrawerOpen = false,
    isAddListDrawerOpen = false,
    onAddItem,
    onAddList,
}: ToolBarAppBarProps) => {
    return (
        <CardContent className="flex items-center justify-between py-2.5">
            {(isItemsPage || !isListsPage) && (
                <ToolBarButton
                    icon={ArrowLeft}
                    title={isItemsPage && onBack ? 'Go back' : 'Go home'}
                    onClick={onBack}
                />
            )}

            {onClearSelected && (
                <ToolBarButton
                    icon={CheckCheck}
                    title="Clear selected items"
                    onClick={onClearSelected}
                    disabled={disableClearSelected}
                />
            )}

            {isItemsPage && onAddItem && (
                <AddItemDrawer
                    open={isAddItemDrawerOpen}
                    onOpenChange={onAddItemClick || (() => {})}
                    onAdd={onAddItem}
                    listType={currentListType}
                    placeholder={placeholder}
                />
            )}

            {isListsPage && onAddList && (
                <AddListDrawer
                    open={isAddListDrawerOpen}
                    onOpenChange={onAddListClick || (() => {})}
                    onAdd={onAddList}
                    placeholder={placeholder}
                />
            )}

            {onRemoveAll && (
                <ToolBarButton
                    icon={Trash2}
                    title="Remove all items"
                    onClick={onRemoveAll}
                    disabled={disableClearAll}
                    variant="destructive"
                    rippleClassName="bg-destructive/30"
                />
            )}

            <ToolBarButton icon={Menu} title="Menu" onClick={onMenuToggle} />
        </CardContent>
    );
};
```

- [ ] **Step 3: Run tests**

```bash
bun test packages/web/src/components/ToolBar/ToolBarAppBar/index.test.tsx
```

Expected: All tests pass ✅

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/ToolBar/ToolBarAppBar/
git commit -m "feat: extract ToolBarAppBar button row with tests"
```

---

## Phase 4: Refactor Main ToolBar Component

### Task 4: Refactor ToolBar to use extracted pieces

**Files:**
- Modify: `packages/web/src/components/ToolBar/index.tsx`

- [ ] **Step 1: Refactor ToolBar**

Replace the entire file with refactored version that uses extracted components:

```typescript
'use client';

import { useAuth, useUser } from '@imapps/web-utils';
import type { ListType } from '@shoppingo/types';
import { MotionConfig } from 'motion/react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useMeasure from 'react-use-measure';

import { useToolBarState } from '@/hooks/useToolBarState';
import { ManageUsersDrawer } from '../ManageUsersDrawer';
import { HamburgerMenu } from './HamburgerMenu';
import { ToolBarMenu } from './ToolBarMenu';
import { ToolBarAppBar } from './ToolBarAppBar';

interface ToolBarProps {
    onAddList?: (name: string, listType: ListType, users: string[]) => Promise<void>;
    onAddItem?: (name: string, quantity?: number, unit?: string, dueDate?: Date) => Promise<void>;
    handleGoBack?: () => void;
    handleClearSelected?: () => void;
    handleRemoveAll?: () => void;
    placeholder?: string;
    currentListType?: ListType;
    currentList?: {
        title: string;
        users: Array<{ id: string; username: string }>;
        ownerId?: string;
    };
    refetchList?: () => void;
    disableClearSelected?: boolean;
    disableClearAll?: boolean;
}

const ToolBar = ({
    onAddList,
    onAddItem,
    handleGoBack,
    handleClearSelected,
    handleRemoveAll,
    placeholder = 'Enter item name...',
    currentListType,
    currentList,
    refetchList,
    disableClearSelected = false,
    disableClearAll = false,
}: ToolBarProps) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { user } = useUser();
    const userId = user?.id;

    const {
        isManageUsersOpen,
        setIsManageUsersOpen,
        isAddItemDrawerOpen,
        setIsAddItemDrawerOpen,
        isAddListDrawerOpen,
        setIsAddListDrawerOpen,
        menuCardRef,
        menuActive,
        setMenuActive,
        isMenuOpen,
        setIsMenuOpen,
    } = useToolBarState();

    const isItemsPage = location.pathname.includes('/list/');
    const isListsPage = location.pathname === '/';

    const [contentRef, { height: contentHeight }] = useMeasure();
    const [menuRef, { width: menuWidth }] = useMeasure();
    const [maxWidth, setMaxWidth] = useState(0);

    useEffect(() => {
        if (!menuWidth || maxWidth > 0) return;
        setMaxWidth(menuWidth);
    }, [menuWidth, maxWidth]);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const transition = {
        type: 'spring' as const,
        bounce: 0.1,
        duration: 0.25,
    };

    return (
        <>
            <div className="fixed bottom-4 left-0 right-0 z-40 px-4">
                <div className="mx-auto max-w-[400px]">
                    <MotionConfig transition={transition}>
                        <div
                            ref={menuCardRef}
                            className="relative"
                        >
                            <ToolBarMenu isOpen={isMenuOpen} contentHeight={contentHeight || 0} maxWidth={maxWidth}>
                                {menuActive === 1 && (
                                    <div ref={contentRef}>
                                        <HamburgerMenu
                                            currentList={currentList}
                                            userId={userId}
                                            onManageUsers={() => {
                                                setIsManageUsersOpen(true);
                                                setIsMenuOpen(false);
                                                setMenuActive(null);
                                            }}
                                            onClose={() => {
                                                setIsMenuOpen(false);
                                                setMenuActive(null);
                                            }}
                                            onLogout={() => {
                                                void handleLogout();
                                                setIsMenuOpen(false);
                                                setMenuActive(null);
                                            }}
                                        />
                                    </div>
                                )}
                            </ToolBarMenu>

                            <ToolBarAppBar
                                ref={menuRef}
                                isItemsPage={isItemsPage}
                                isListsPage={isListsPage}
                                onBack={() => {
                                    if (isItemsPage && handleGoBack) {
                                        handleGoBack();
                                    } else {
                                        navigate('/');
                                    }
                                }}
                                onMenuToggle={() => {
                                    setIsMenuOpen(!isMenuOpen);
                                    if (!isMenuOpen) {
                                        setMenuActive(1);
                                    } else {
                                        setMenuActive(null);
                                    }
                                }}
                                onClearSelected={handleClearSelected}
                                onRemoveAll={handleRemoveAll}
                                disableClearSelected={disableClearSelected}
                                disableClearAll={disableClearAll}
                                currentListType={currentListType}
                                placeholder={placeholder}
                                isAddItemDrawerOpen={isAddItemDrawerOpen}
                                isAddListDrawerOpen={isAddListDrawerOpen}
                                onAddItemClick={setIsAddItemDrawerOpen}
                                onAddListClick={setIsAddListDrawerOpen}
                                onAddItem={onAddItem}
                                onAddList={onAddList}
                            />
                        </div>
                    </MotionConfig>
                </div>
            </div>

            {currentList && isItemsPage && (
                <ManageUsersDrawer
                    open={isManageUsersOpen}
                    onOpenChange={setIsManageUsersOpen}
                    currentList={currentList}
                    refetchList={refetchList}
                />
            )}
        </>
    );
};

export default ToolBar;
```

- [ ] **Step 2: Type check**

```bash
bun run tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/ToolBar/index.tsx
git commit -m "refactor: simplify ToolBar to use extracted components"
```

---

## Phase 5: Verify Refactoring

### Task 5: Run all tests and verify build

- [ ] **Step 1: Run all ToolBar tests**

```bash
bun test packages/web/src/components/ToolBar/
```

Expected: All tests pass ✅

- [ ] **Step 2: Type check entire project**

```bash
bun run tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Verify build succeeds**

```bash
bun run --filter @shoppingo/web build
```

Expected: Build completes with no errors

- [ ] **Step 4: Final verification**

```bash
git log --oneline -n 5
```

Expected: 5 commits with clear, atomic changes

---

## Summary

This plan extracts the complex ToolBar component into focused, testable pieces:
- **ToolBarButton** - Reusable button component (12 tests)
- **ToolBarMenu** - Animated menu container (5 tests)
- **ToolBarAppBar** - App bar button row (8 tests)
- **Refactored ToolBar** - Main orchestration component reduced from 269 → ~100 lines

Total: 25 new tests, all using bun:test framework with proper cleanup and assertions.
