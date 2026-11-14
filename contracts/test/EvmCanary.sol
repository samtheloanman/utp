// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title EvmCanary
 * @notice Verifies Shanghai/Cancun EVM opcode support (`PUSH0`, `MCOPY`, `TSTORE`/`TLOAD`) on target chains.
 */
contract EvmCanary {
    bool public immutable deployedOk;

    error CanaryPush0Mismatch(uint256 actual);
    error CanaryMemoryCopyMismatch();
    error CanaryTransientMismatch(uint256 actual);

    event CancunCanaryVerified(uint256 transientValue, bytes copiedPayload);

    constructor() {
        checkCancunOpcodes();
        deployedOk = true;
    }

    function checkCancunOpcodes()
        public
        returns (uint256 transientVal, bytes memory copied, uint256 zeroVal)
    {
        // 1. Exercise PUSH0 via zero-initialized return/local slot
        assembly {
            zeroVal := 0
        }
        if (zeroVal != 0) revert CanaryPush0Mismatch(zeroVal);

        // 2. Exercise MCOPY via both bytes.concat and explicit Yul mcopy
        bytes memory source = bytes.concat(bytes("utp-"), bytes("cancun"));
        copied = new bytes(source.length);
        assembly {
            let len := mload(source)
            mcopy(add(copied, 0x20), add(source, 0x20), len)
        }
        if (keccak256(copied) != keccak256(bytes("utp-cancun"))) {
            revert CanaryMemoryCopyMismatch();
        }

        // 3. Exercise EIP-1153 TSTORE / TLOAD transient storage and clear slot
        assembly {
            tstore(0, 42)
            transientVal := tload(0)
            tstore(0, 0)
        }
        if (transientVal != 42) revert CanaryTransientMismatch(transientVal);

        emit CancunCanaryVerified(transientVal, copied);
    }
}
