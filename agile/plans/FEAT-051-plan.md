<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-051 — Plan

**Item:** [`agile/items/FEAT-051-tags-list.md`](../items/FEAT-051-tags-list.md)
**Branch:** `feature/FEAT-051-tags`
**Status:** implemented.

**Branch point.** Cut from `feature/FEAT-050-reflog`, continuing the unmerged
stack.

## Approach

### Two kinds of tag, kept apart

A lightweight tag is a ref pointing at a commit. An annotated tag is an object
of its own — tagger, date, message — that points at the commit. The list marks
which is which rather than flattening them, because *"v1.0.0 has no message"*
and *"v1.0.0 cannot have a message"* are different answers, and a row that
simply showed nothing would be giving the first to a question about the second.

It also decides what is offered: **edit message** is a live control on an
annotated tag and a plain label on a lightweight one. Turning a lightweight tag
into an annotated one is a real change, and it is not what a button labelled
"edit message" should do without saying so.

### Peeled, always

`into_fully_peeled_id` on every tag ref, so the target is the commit even for an
annotated tag. Unpeeled, the target would be the tag object, and every screen
that looked a commit up by it would find nothing.

Telling the two apart is then a second read: the ref's *own* target, unpeeled,
is a tag object exactly when the tag is annotated.

### Newest first, and what that costs

Not alphabetical: `v10.0.0` sorts before `v2.0.0` in any string order, and a
version-aware sort would have to guess at a scheme this project does not get to
choose. Time is the one ordering that is right without guessing.

The cost is worth stating: an annotated tag is dated by its tagger and a
lightweight one by the commit it points at, because that is the only date it
has. So a lightweight tag made today on a commit from last year sorts as last
year. That is surprising once and correct thereafter, and the footer says it.

### `retag` deletes before it creates

A tag object is immutable — git's own `tag -a -f` does the same thing. Which
means an empty message would leave **no tag at all**, so it is refused in the
core *and* in the store. Two guards, because the two layers fail in different
places and only one of them is on screen.

The confirmation says what moves: the message changes, and so do the date and
the tagger, and a tag already pushed needs forcing to update the remote.

### Where it sits

Rail entry `1N`, beside Branches — they are the same kind of thing, named
positions in history. The rail has counted `tags` since FEAT-001 and that count
went nowhere; it now goes here.

`1N` is numbered after the design handoff's `1A`–`1L` run rather than inserted
into it, the same as the Reflog's `1M`, so that a screen code still says where a
screen came from.

## What was not done

- **Pushing tags.** A network operation; FEAT-018's remaining work.
- **Signature verification.** FEAT-019 owns signing, and showing a signature
  that cannot be verified is worse than showing none.
- **A tag's own diff or file tree.** The Diff screen already answers that from
  the commit, and the row's short id reaches it.
