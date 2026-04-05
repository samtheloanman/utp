// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;


import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @dev Contract module which acts as a timelocked controller. When set as the
 * owner of an `Ownable` smart contract, it enforces a timelock on all
 * `onlyOwner` maintenance operations. This gives time for users of the
 * controlled contract to exit before a potentially dangerous maintenance
 * operation is applied.
 *
 * By default, this contract is self-administered, meaning administration tasks
 * have to go through the timelock process. The proposer (resp. executor) role
 * is in charge of proposing (resp. executing) operations. A common use case is
 * to position this TimelockController as the owner of a smart contract, with
 * a multisig wallet as administrator.
 */
contract TimelockController is AccessControl {
    bytes32 public constant TIMELOCK_ADMIN_ROLE = keccak256("TIMELOCK_ADMIN_ROLE");
    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");
    bytes32 public constant CANCELLER_ROLE = keccak256("CANCELLER_ROLE");
    uint256 public constant MIN_DELAY = 3600; // 1 hour

    mapping(bytes32 => uint256) private _timestamps;

    uint256 internal constant _DONE_TIMESTAMP = 1;

    event CallScheduled(
        bytes32 indexed id,
        uint256 indexed index,
        address target,
        uint256 value,
        bytes data,
        bytes32 predecessor,
        uint256 delay
    );

    event CallExecuted(
        bytes32 indexed id,
        uint256 indexed index,
        address target,
        uint256 value,
        bytes data
    );

    event CallCancelled(bytes32 indexed id);

    constructor(
        address admin,
        address proposer,
        address executor
    ) {
        _grantRole(TIMELOCK_ADMIN_ROLE, admin);
        _grantRole(PROPOSER_ROLE, proposer);
        _grantRole(EXECUTOR_ROLE, executor);
        _setRoleAdmin(PROPOSER_ROLE, TIMELOCK_ADMIN_ROLE);
        _setRoleAdmin(EXECUTOR_ROLE, TIMELOCK_ADMIN_ROLE);
    }

    function isOperation(bytes32 id) public view returns (bool) {
        return getTimestamp(id) > 0;
    }

    function isOperationPending(bytes32 id) public view returns (bool) {
        return getTimestamp(id) > _DONE_TIMESTAMP;
    }

    function isOperationReady(bytes32 id) public view returns (bool) {
        return _timestamps[id] > 0 && block.timestamp >= _timestamps[id];
    }

    function getTimestamp(bytes32 id) public view returns (uint256) {
        return _timestamps[id];
    }

    function schedule(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt,
        uint256 delay
    ) public virtual onlyRole(PROPOSER_ROLE) {
        bytes32 id = hashOperation(target, value, data, predecessor, salt);
        _schedule(id, delay);
        emit CallScheduled(id, 0, target, value, data, predecessor, delay);
    }

    function scheduleBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas,
        bytes32 predecessor,
        bytes32 salt,
        uint256 delay
    ) public virtual onlyRole(PROPOSER_ROLE) {
        require(targets.length == values.length, "TimelockController: invalid arrays length");
        require(targets.length == datas.length, "TimelockController: invalid arrays length");

        bytes32 id = hashOperationBatch(targets, values, datas, predecessor, salt);
        _schedule(id, delay);
        for (uint256 i = 0; i < targets.length; ++i) {
            emit CallScheduled(id, i, targets[i], values[i], datas[i], predecessor, delay);
        }
    }

    function cancel(bytes32 id) public virtual onlyRole(CANCELLER_ROLE) {
        require(isOperationPending(id), "TimelockController: operation is not pending");
        _timestamps[id] = _DONE_TIMESTAMP;
        emit CallCancelled(id);
    }

    function execute(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt
    ) public payable virtual onlyRole(EXECUTOR_ROLE) {
        bytes32 id = hashOperation(target, value, data, predecessor, salt);
        _beforeExecute(id);
        _execute(target, value, data);
        _afterExecute(id);
        emit CallExecuted(id, 0, target, value, data);
    }

    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas,
        bytes32 predecessor,
        bytes32 salt
    ) public payable virtual onlyRole(EXECUTOR_ROLE) {
        require(targets.length == values.length, "TimelockController: invalid arrays length");
        require(targets.length == datas.length, "TimelockController: invalid arrays length");

        bytes32 id = hashOperationBatch(targets, values, datas, predecessor, salt);
        _beforeExecute(id);
        for (uint256 i = 0; i < targets.length; ++i) {
            address target = targets[i];
            uint256 value = values[i];
            bytes calldata data = datas[i];
            _execute(target, value, data);
            emit CallExecuted(id, i, target, value, data);
        }
        _afterExecute(id);
    }

    function hashOperation(
        address target,
        uint256 value,
        bytes calldata data,
        bytes32 predecessor,
        bytes32 salt
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(target, value, data, predecessor, salt));
    }

    function hashOperationBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas,
        bytes32 predecessor,
        bytes32 salt
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(targets, values, datas, predecessor, salt));
    }

    function _schedule(bytes32 id, uint256 delay) internal {
        require(!isOperation(id), "TimelockController: operation already scheduled");
        require(delay >= MIN_DELAY, "TimelockController: insufficient delay");
        _timestamps[id] = block.timestamp + delay;
    }

    function _beforeExecute(bytes32 id) internal view {
        require(isOperationReady(id), "TimelockController: operation is not ready");
    }

    function _afterExecute(bytes32 id) internal {
        require(isOperationPending(id), "TimelockController: operation is not pending");
        _timestamps[id] = _DONE_TIMESTAMP;
    }

    function _execute(address target, uint256 value, bytes calldata data) internal {
        (bool success, ) = target.call{value: value}(data);
        require(success, "TimelockController: underlying transaction reverted");
    }
}

