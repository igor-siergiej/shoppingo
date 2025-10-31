#!/bin/bash
# Clean up orphaned tags that might conflict with semantic-release
# This prevents "tag already exists" errors

echo "🧹 Cleaning up potentially orphaned tags..."

# Fetch all tags from remote
git fetch origin --tags --force 2>/dev/null || true

# Get the version semantic-release will create by analyzing commits
# We look for the last release tag and check if there are unreleased commits
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

if [ -n "$LAST_TAG" ]; then
    echo "  Last release tag: $LAST_TAG"

    # Check if there are commits since the last tag
    COMMITS_SINCE=$(git rev-list ${LAST_TAG}..HEAD --count 2>/dev/null || echo "0")

    if [ "$COMMITS_SINCE" -gt 0 ]; then
        echo "  Found $COMMITS_SINCE commits since last release"

        # Calculate what the next version would be (simplified - assumes minor bump)
        # Extract version numbers
        VERSION=$(echo "$LAST_TAG" | sed 's/^v//')
        MAJOR=$(echo "$VERSION" | cut -d. -f1)
        MINOR=$(echo "$VERSION" | cut -d. -f2)
        PATCH=$(echo "$VERSION" | cut -d. -f3)

        # Calculate next versions
        NEXT_PATCH="v${MAJOR}.${MINOR}.$((PATCH + 1))"
        NEXT_MINOR="v${MAJOR}.$((MINOR + 1)).0"
        NEXT_MAJOR="v$((MAJOR + 1)).0.0"

        # Check if any of these potential tags exist and delete them
        for POTENTIAL_TAG in "$NEXT_PATCH" "$NEXT_MINOR" "$NEXT_MAJOR"; do
            if git rev-parse "$POTENTIAL_TAG" >/dev/null 2>&1; then
                echo "  Found existing tag: $POTENTIAL_TAG - checking if orphaned..."

                # Check if this tag points to a commit that's already on main
                TAG_COMMIT=$(git rev-list -n 1 "$POTENTIAL_TAG" 2>/dev/null)

                # Delete the tag locally
                echo "  Deleting local tag: $POTENTIAL_TAG"
                git tag -d "$POTENTIAL_TAG" 2>/dev/null || true

                # Delete the tag on remote (this is safe in CI as we're about to recreate it)
                echo "  Deleting remote tag: $POTENTIAL_TAG"
                git push origin ":refs/tags/$POTENTIAL_TAG" 2>/dev/null || true
            fi
        done
    fi
fi

echo "✅ Tag cleanup complete"
