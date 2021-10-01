import { useDispatch } from 'react-redux'
import { useCallback, useContext } from 'react'
import { utils, BigNumber } from 'ethers'

import { useActiveWeb3React } from '.'

import { BridgeContext } from '../contexts/BridgeProvider'
import { BridgeAssetType, BridgeTxn } from '../state/bridgeTransactions/types'
import { addBridgeTxn, updateBridgeTxnReceipt } from '../state/bridgeTransactions/actions'

export const useBridge = () => {
  return useContext(BridgeContext)
}

export const useArbBridge = () => {
  const {
    bridge,
    chainIdPair: { l1ChainId, l2ChainId }
  } = useBridge()

  const dispatch = useDispatch()
  const { account } = useActiveWeb3React()

  const depositEth = useCallback(
    async (value: string) => {
      if (!account || !bridge || !l1ChainId || !l2ChainId) return

      const weiValue = utils.parseEther(value)

      try {
        const txn = await bridge.depositETH(weiValue)

        dispatch(
          addBridgeTxn({
            assetName: 'ETH',
            assetType: BridgeAssetType.ETH,
            type: 'deposit-l1',
            value,
            txHash: txn.hash,
            chainId: l1ChainId,
            sender: account
          })
        )

        const l1Receipt = await txn.wait()

        dispatch(
          updateBridgeTxnReceipt({
            chainId: l1ChainId,
            txHash: txn.hash,
            receipt: l1Receipt
          })
        )
      } catch (err) {
        throw err
      }
    },
    [account, bridge, dispatch, l1ChainId, l2ChainId]
  )

  const withdrawEth = useCallback(
    async (value: string) => {
      if (!account || !bridge || !l2ChainId) return
      const weiValue = utils.parseEther(value)

      try {
        const txn = await bridge.withdrawETH(weiValue)

        dispatch(
          addBridgeTxn({
            assetName: 'ETH',
            assetType: BridgeAssetType.ETH,
            type: 'withdraw',
            value,
            txHash: txn.hash,
            chainId: l2ChainId,
            sender: account
          })
        )

        const withdrawReceipt = await txn.wait()

        dispatch(
          updateBridgeTxnReceipt({
            chainId: l2ChainId,
            txHash: txn.hash,
            receipt: withdrawReceipt
          })
        )
      } catch (err) {
        throw err
      }
    },
    [account, bridge, dispatch, l2ChainId]
  )

  const triggerOutboxEth = useCallback(
    async ({ batchIndex, batchNumber, value }: Pick<BridgeTxn, 'batchIndex' | 'batchNumber' | 'value'>) => {
      if (!account || !bridge || !l1ChainId || batchIndex || batchNumber || value) return

      const batchNumberBN = BigNumber.from(batchNumber)
      const batchIndexBN = BigNumber.from(batchIndex)

      const l2ToL1 = await bridge.triggerL2ToL1Transaction(batchNumberBN, batchIndexBN, true)

      dispatch(
        addBridgeTxn({
          assetName: 'ETH',
          assetType: BridgeAssetType.ETH,
          type: 'outbox',
          value,
          txHash: l2ToL1.hash,
          chainId: l1ChainId,
          sender: account
        })
      )

      try {
        const l2ToL1Receipt = await l2ToL1.wait()
        dispatch(
          updateBridgeTxnReceipt({
            chainId: l1ChainId,
            txHash: l2ToL1.hash,
            receipt: l2ToL1Receipt
          })
        )
        return l2ToL1Receipt
      } catch (err) {
        throw err
      }
    },
    [account, bridge, dispatch, l1ChainId]
  )

  const withdrawERC20 = useCallback(
    async (l1TokenAddress: string, value: string) => {
      if (!account || !bridge || !l2ChainId) return
      const tokenData = (await bridge.getAndUpdateL1TokenData(l1TokenAddress)).ERC20
      if (!tokenData) {
        throw new Error("Can't withdraw; token not found")
      }

      const weiValue = utils.parseUnits(value, tokenData.decimals)

      try {
        const txn = await bridge.withdrawERC20(l1TokenAddress, weiValue)
        dispatch(
          addBridgeTxn({
            assetName: tokenData.symbol,
            assetType: BridgeAssetType.ERC20,
            type: 'withdraw',
            value,
            txHash: txn.hash,
            chainId: l2ChainId,
            sender: account
          })
        )

        const withdrawReceipt = await txn.wait()

        dispatch(
          updateBridgeTxnReceipt({
            chainId: l2ChainId,
            txHash: txn.hash,
            receipt: withdrawReceipt
          })
        )
      } catch (err) {
        throw err
      }
    },
    [account, bridge, dispatch, l2ChainId]
  )

  const triggerOutboxERC20 = useCallback(
    async ({
      batchIndex,
      batchNumber,
      value,
      assetName
    }: Pick<BridgeTxn, 'batchIndex' | 'batchNumber' | 'value' | 'assetName'>) => {
      if (!account || !bridge || !l1ChainId || batchIndex || batchNumber || value) return

      const batchNumberBN = BigNumber.from(batchNumber)
      const batchIndexBN = BigNumber.from(batchIndex)

      const l2ToL1 = await bridge.triggerL2ToL1Transaction(batchNumberBN, batchIndexBN, true)

      dispatch(
        addBridgeTxn({
          assetName,
          assetType: BridgeAssetType.ERC20,
          type: 'outbox',
          value,
          txHash: l2ToL1.hash,
          chainId: l1ChainId,
          sender: account
        })
      )

      try {
        const l2ToL1Receipt = await l2ToL1.wait()
        dispatch(
          updateBridgeTxnReceipt({
            chainId: l1ChainId,
            txHash: l2ToL1.hash,
            receipt: l2ToL1Receipt
          })
        )
        return l2ToL1Receipt
      } catch (err) {
        throw err
      }
    },
    [account, bridge, dispatch, l1ChainId]
  )

  return {
    depositEth,
    withdrawEth,
    triggerOutboxEth,
    withdrawERC20,
    triggerOutboxERC20
  }
}
