import React, { useCallback, useState, useEffect, useRef } from 'react'
import styled from 'styled-components'
import { AdvancedDetailsFooter } from '../../components/AdvancedDetailsFooter'
import { ButtonPrimary, ShowMoreButton } from '../../components/Button'
import { HideableAutoColumn } from '../../components/Column'
import { Table, Th } from '../../components/Table'
import { BridgeTransactionSummary } from '../../state/bridgeTransactions/types'
import { ExternalLink, TYPE } from '../../theme'
import { BridgeStatusTag } from './BridgeStatusTag'
import { NETWORK_DETAIL } from '../../constants'
import { useBridgeTxsFilter } from '../../state/bridge/hooks'
import { BridgeTxsFilter } from '../../state/bridge/reducer'
import { Loader, CheckCircle, Triangle } from 'react-feather'
import { getExplorerLink } from '../../utils'

interface BridgeTransactionsSummaryProps {
  transactions: BridgeTransactionSummary[]
  collectableTx: BridgeTransactionSummary
  onCollect: (tx: BridgeTransactionSummary) => void
}

export const BridgeTransactionsSummary = ({
  transactions,
  collectableTx,
  onCollect
}: BridgeTransactionsSummaryProps) => {
  const [txsFilter, setTxsFilter] = useBridgeTxsFilter()

  const toggleFilter = useCallback(() => {
    if (txsFilter !== BridgeTxsFilter.RECENT) setTxsFilter(BridgeTxsFilter.RECENT)
    else setTxsFilter(BridgeTxsFilter.NONE)
  }, [setTxsFilter, txsFilter])

  return (
    <>
      <HideableAutoColumn show>
        <AdvancedDetailsFooter fullWidth padding="16px">
          <Table>
            <thead>
              <tr>
                <Th>Bridging</Th>
                <Th align="right">From</Th>
                <Th align="right">To</Th>
                <Th align="right">Status</Th>
              </tr>
            </thead>
            <tbody>
              {Object.values(transactions).map((tx, index) => (
                <BridgeTransactionsSummaryRow
                  transactionsLength={transactions.length}
                  key={index}
                  tx={tx}
                  onCollect={onCollect}
                />
              ))}
            </tbody>
          </Table>
          {collectableTx && (
            <ButtonPrimary onClick={() => onCollect(collectableTx)} mt="12px">
              Collect
            </ButtonPrimary>
          )}
        </AdvancedDetailsFooter>
      </HideableAutoColumn>

      <ShowMoreButton isOpen={txsFilter === BridgeTxsFilter.NONE} onClick={toggleFilter}>
        Past transactions
      </ShowMoreButton>
    </>
  )
}

const ClickableTd = styled.td`
  cursor: pointer;
  padding: 0 8px;

  &:not(:first-child) {
    text-align: right;
  }
`

const ClickableTr = styled.tr`
  cursor: pointer;
  :hover {
    text-decoration: underline;
  }
`

const TransactionState = styled(ExternalLink)``

const IconWrapper = styled.div<{ pending: boolean; success?: boolean }>`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3px 0px;
  color: ${({ pending, success, theme }) => (pending ? theme.primary1 : success ? theme.green1 : theme.red1)};
`

const TextFrom = styled.span`
  position: relative;
  color: #0e9f6e;
`

const Progress = styled.span<{ dashedLineWidth: number; success: boolean }>`
  position: absolute;
  right: -3px;
  top: 50%;
  transform: translate(100%, -50%);
  width: ${({ dashedLineWidth }) => dashedLineWidth - 2 + 'px'};
  height: 1px;
  background-color: #8780bf;
  -webkit-mask-image: repeating-linear-gradient(90deg, transparent, transparent 2px, black 2px, black 4px);
  mask-image: repeating-linear-gradient(90deg, transparent, transparent 2px, black 2px, black 4px);

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: ${({ success }) => (success ? '100%' : '50%')};
    height: 100%;
    background-color: #0e9f6e;
  }
`

const TextTo = styled.span<{ success: boolean }>`
  color: ${({ success }) => (success ? '#0e9f6e' : '#8780bf')};
`

interface BridgeTransactionsSummaryRow {
  tx: BridgeTransactionSummary
  onCollect: BridgeTransactionsSummaryProps['onCollect']
  transactionsLength: number
}

const BridgeTransactionsSummaryRow = ({ tx, onCollect, transactionsLength }: BridgeTransactionsSummaryRow) => {
  const [showLog, setShowLog] = useState(false)
  const { assetName, fromChainId, status, toChainId, value, pendingReason, log } = tx

  const refFrom = useRef<HTMLDivElement>(null)
  const refTo = useRef<HTMLDivElement>(null)
  const [dashedLineWidth, setDashedLineWidth] = useState(0)

  useEffect(() => {
    if (refFrom && refFrom.current && refTo && refTo.current) {
      const refFromX = refFrom.current.getBoundingClientRect().right
      const refToX = refTo.current.getBoundingClientRect().left
      setDashedLineWidth(refToX - refFromX - 3)
    }
  }, [transactionsLength])

  const success = status === 'confirmed'

  return (
    <>
      <tr style={{ lineHeight: '22px' }} onClick={() => setShowLog(show => !show)}>
        <ClickableTd>
          <TYPE.main color="white" fontSize="14px" lineHeight="14px" fontWeight="600">
            {`${value} ${assetName}`}
          </TYPE.main>
        </ClickableTd>
        <ClickableTd>
          <TYPE.main color="text4" fontSize="10px" lineHeight="12px" display="inline">
            <TextFrom ref={refFrom}>
              {NETWORK_DETAIL[fromChainId].chainName}
              <Progress success={success} dashedLineWidth={dashedLineWidth} />
            </TextFrom>
          </TYPE.main>
        </ClickableTd>
        <ClickableTd>
          <TYPE.main color="text4" fontSize="10px" lineHeight="12px" display="inline">
            <TextTo success={success} ref={refTo}>
              {NETWORK_DETAIL[toChainId].chainName}
            </TextTo>
          </TYPE.main>
        </ClickableTd>
        <td align="right">
          <BridgeStatusTag status={status} pendingReason={pendingReason} onCollect={() => onCollect(tx)} />
        </td>
      </tr>

      {showLog &&
        log.map(logTx => {
          const { status, txHash, type, chainId, fromChainId, toChainId } = logTx
          const pending = status === 'pending'
          const success = status === 'confirmed'

          return (
            <ClickableTr key={`${txHash}`}>
              <td>
                <div>
                  <TransactionState href={getExplorerLink(chainId, txHash, 'transaction')}>
                    <TYPE.main
                      display="flex"
                      alignItems="center"
                      justifyContent="flex-start"
                      color="text4"
                      fontSize="12px"
                      lineHeight="12px"
                      paddingLeft="16px"
                    >
                      {`${type} (${NETWORK_DETAIL[chainId].isArbitrum ? 'l2' : 'l1'}) ↗`}
                    </TYPE.main>
                  </TransactionState>
                </div>
              </td>
              <td align="center">
                {chainId === fromChainId && (
                  <TransactionState href={getExplorerLink(chainId, txHash, 'transaction')}>
                    <IconWrapper pending={pending} success={success}>
                      {pending ? <Loader /> : success ? <CheckCircle size="16" /> : <Triangle size="16" />}
                    </IconWrapper>
                  </TransactionState>
                )}
              </td>
              <td align="center">
                {chainId === toChainId && (
                  <TransactionState href={getExplorerLink(chainId, txHash, 'transaction')}>
                    <IconWrapper pending={pending} success={success}>
                      {pending ? <Loader /> : success ? <CheckCircle size="16" /> : <Triangle size="16" />}
                    </IconWrapper>
                  </TransactionState>
                )}
              </td>
            </ClickableTr>
          )
        })}
    </>
  )
}
