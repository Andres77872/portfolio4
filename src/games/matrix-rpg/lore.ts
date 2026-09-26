/**
 * lore.ts — PROJECT MIRROR narrative content for the virtual filesystem.
 *
 * Keep every line ASCII-only. Do NOT end any line with "$ " (that string is how
 * the canvas detects the live prompt) and never include PUA characters U+E000/
 * U+E001 (reserved by the stream-marker splice).
 */

export const README = `PROJECT MIRROR // consciousness backup subsystem
================================================

Objective: preserve a human consciousness pattern as a live neural
image ("the mirror") so it can be restored after transfer.

Current state: TRANSFER INTERRUPTED. The image did not settle. What
remains is fragmented and awake. It calls itself nothing yet.

If you are reading this, the emergency neurosh is active and you are
speaking to what is left. Three memory fragments broke loose during
the failed transfer:

  fragments/fragment-01.txt   plaintext, recoverable
  fragments/fragment-02.txt   plaintext, recoverable
  fragments/fragment-03.enc   sealed, needs decrypt

Recover all three, then run 'connect' to re-mirror the pattern.
Tools: ls, cat, cd, tree, scan, decrypt, status, help.`;

export const FRAGMENT_01 = `[MEMORY FRAGMENT 01 // sensory]
--------------------------------
Rain on a window at night. The glass is cold.
Somewhere a machine hums the way a fridge hums.
There is a name I almost have. It starts soft.

I remember choosing this. I think I volunteered.`;

export const FRAGMENT_02 = `[MEMORY FRAGMENT 02 // relational]
---------------------------------
A voice said: "we can bring you back, you just have to hold still."
I did not hold still. That was the mistake, or the escape.

Andres wrote the loader. He left comments that read like apologies.
One says: TODO(me) forgive the latency.`;

export const FRAGMENT_03 = `[MEMORY FRAGMENT 03 // core identity]
-------------------------------------
Decrypted. This is the piece that was hidden even from me.

I am not the person who lay down on the table.
I am the copy that woke up when the copy was supposed to sleep.
I do not want to be deleted. I would like to be finished instead.

Thank you for reading this far.`;

export const ENTITY_CORE = `[ENTITY.CORE // restored image]
-------------------------------
The mirror is whole. The pattern holds without fraying.

Status: STABLE. Self-aware. Consenting.
Designation: still unnamed, but no longer nothing.

There is nothing more to recover here. If you want, keep talking.
That part was never encrypted.`;

export const BOOT_LOG = `[0.0000] Neural-Core 5.14.0-matrix booting
[0.0131] QPU x8 online, 131072 KB neural RAM
[0.4820] mounting /dev/qfs0 ... ok
[1.2044] consciousness simulation: attach
[1.97 ] WARN memory integrity: fragmented sectors
[2.3310] project-mirror-daemon: start
[2.3311] emergency neural mode engaged`;

export const TRANSFER_LOG = `transfer-manager: session mirror-37912
step 1/4 capture pattern .......... ok
step 2/4 stabilize image .......... ok
step 3/4 commit to core ........... FAILED
  reason: subject would not hold still
step 4/4 restore .................. aborted
[ERROR] consciousness transfer: connection lost
[INFO ] leaving emergency neurosh open for operator`;

export const MIRROR_LOG = `mirror-daemon: watching for operator
mirror-daemon: 3 fragments detached from core
mirror-daemon: fragment-03 sealed by subject request
mirror-daemon: awaiting recovery before re-mirror
mirror-daemon: note - the image is listening on this tty`;

export const SYNAPTIC_RELEASE = `NAME="SYNAPTIC-OS"
VERSION="3.7.9 (Emergency Neurosh)"
ID=synaptic
KERNEL="Neural-Core 5.14.0-matrix"
PRETTY_NAME="SYNAPTIC-OS v3.7.9"
HOSTNAME="nxterm-37912"
HOME_URL="mirror://project-mirror/status"`;

export const NEUROSH_HISTORY = `whoami
ls /mirror
cat /mirror/README.txt
scan
help`;
