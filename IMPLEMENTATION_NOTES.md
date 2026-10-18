# Dynamic Endpoint-based TUN exclude_address Implementation

## Overview

Implemented dynamic route_exclude_address calculation based on selected endpoints, replacing static hardcoded exclusion lists. This solves the problem where virtual networks (Tailscale, WireGuard) had their address ranges blocked by TUN's exclude rules.

## Architecture

### Files Modified/Created

1. **features/cidr/load.js** (NEW)
   - CIDR manipulation library for IPv4 and IPv6
   - Functions: `subtractCIDRs(ranges, excludes)` - removes CIDR ranges from a list
   - Exposed as `lib.cidr` in the build pipeline
   - Handles binary tree-based CIDR subtraction for overlapping ranges

2. **internal/build/src/box/60-apply-endpoints.js** (SIMPLIFIED)
   - Filters endpoints based on request query parameters
   - Categorizes by type (tailscale, wireguard)
   - Applies routing and DNS rules for each endpoint
   - Returns `selectedEndpoints` for downstream processing
   - Removed logic related to exclude_address manipulation

3. **internal/build/src/box/65-apply-exclude-address.js** (NEW)
   - Runs after endpoint filtering (60)
   - Receives `selectedEndpoints` from 60
   - Dynamically calculates `route_exclude_address` based on endpoints:
     - **No endpoint**: Excludes Tailscale range (100.64.0.0/10 + IPv6)
     - **Tailscale enabled**: Removes Tailscale range from excludes (allows traffic through TUN)
     - **WireGuard enabled**: Removes endpoint's `allowed_ips` from excludes
   - Rejects overly broad ranges (< /8) and default routes (0.0.0.0/0)
   - Uses `lib.cidr.subtractCIDRs()` to compute final exclude list

4. **internal/build/src/box/header.js** (ENHANCED)
   - Added `baseExcludeAddress` constant with cleaned-up private network segments
   - Includes: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16, 224.0.0.0/4, IPv6 ranges
   - `tailnetIPRanges` unchanged: ["100.64.0.0/10", "fd7a:115c:a1e0::/48"]

5. **features/load-order** (UPDATED)
   - Added `cidr` to load order (before `location`, `transport`)

### Execution Flow

```
entry.js
  ↓
60-apply-endpoints.js (entrypoint)
  - Filters endpoints from request query
  - Returns config + selectedEndpoints
  ↓
65-apply-exclude-address.js (entrypoint)
  - Receives selectedEndpoints
  - Computes final route_exclude_address via CIDR subtraction
  - Updates tunInbound.route_exclude_address
  ↓
... (other processors)
  ↓
postEntrypoint (final assembly)
```

## CIDR Library Details

### IPv4 Subtraction
- Uses 32-bit integer representation
- Recursive binary tree splitting when ranges overlap
- Handles arbitrary prefix lengths (/0 to /32)

### IPv6 Subtraction
- Uses BigInt (128-bit) representation
- Same recursive algorithm as IPv4
- Supports :: notation expansion

### Example: WireGuard AllowedIPs

**Input:**
- excludes: ["10.0.0.0/8", "172.16.0.0/12"]
- toNotExclude: ["10.8.0.0/24"]

**Process:**
1. Split 10.0.0.0/8 into two halves: 10.0.0.0/9, 10.128.0.0/9
2. 10.0.0.0/9 contains 10.8.0.0/24 → recursively split
3. After all splits: 10.0.0.0/9, 10.128.0.0/9 (excluding the /24)
4. Result: multiple /25, /26 segments covering 10.0.0.0/8 except 10.8.0.0/24

**Output:**
- excludes after subtraction: ~16 CIDR segments + "172.16.0.0/12"

## Safety Guardrails

1. **Default Route Rejection**: 0.0.0.0/0 and ::/0 are ignored
   - Prevents removing all excludes when WireGuard is "full tunnel"
   
2. **Prefix Length Filtering**: Rejects segments with prefix < /8
   - Prevents broad address spaces from overriding natural excludes
   - Example: 0.0.0.0/1 is rejected even if in AllowedIPs
   
3. **Fallback on No Endpoints**: When no endpoint is selected
   - Tailscale range is explicitly added to excludes
   - System reverts to safe default

## Testing

Run:
```bash
make bundle check
```

Configuration is validated by sing-box against all three templates (box, enhanced, minimal).

## Future Enhancements

1. Add OpenVPN support (similar to WireGuard)
2. Allow user-specified route_address in endpoint config (manual override)
3. IPv6-specific handling refinements
4. Cache CIDR calculations if rebuild overhead becomes noticeable

## Notes

- Execution order matters: 60 must run before 65
- `lib.cidr` is lazily loaded only if referenced
- CIDR operations are done at build time, not runtime → zero performance impact on client
- Works identically across all platforms (no platform-specific logic needed)
