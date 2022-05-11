import { BigNumber as bn, constants, utils } from 'ethers'

export const oneMonth = 30 * 24 * 60 * 60
export const splitsFractionMax = 1000000

export const fromWei = (wei) => {
  wei = bn.isBigNumber(wei) ? wei : bn.from(wei)
  return wei.div(constants.WeiPerEther)
}

export const toWei = (dai) => {
  return utils.parseUnits(dai.toString())
}

export const toDAI = (wei, frmt = 'pretty', roundTo) => {
  const dai = utils.formatEther(wei)
  if (frmt === 'exact') {
    return dai
  }
  return round(dai, roundTo)
}

// clip to nearest hundredth (dont round up)
export const round = (num, dec = 2) => (Math.floor(num * 100) / 100).toFixed(dec)


export const toDAIPerMo = (wei) => {
  wei = bn.isBigNumber(wei) ? wei : bn.from(wei)
  const dai = utils.formatEther(wei.mul(oneMonth))

  // round to nearest hundredth
  return Math.round(parseFloat(dai) * 100) / 100
}

export const toWeiPerSec = (dai = 0) => {
  // warning! BN will clip off the decimal...
  // (but maybe good for when setting minAmtPerSec)
  return utils.parseUnits(dai.toString()).div(oneMonth)
}

/*
 * Formats splits for contract method input.
 *
 * @param The splits with format [{ address, percent }]
*/
export const formatSplits = (splits) => {
  splits = splits || []
  let receivers = []
  const splitFractionMax = 1000000
  const hasSplits = splits.length && splits.find(split => split.percent > 0 && split.address.length)

  if (hasSplits) {
    // format as array
    receivers = splits.map(split => {
      const amtPerSec = parseInt(split.percent) / 100 * splitFractionMax
      return [
        split.address, // receiver
        amtPerSec
      ]
    })

    // sort by address alphabetical
    receivers = receivers.sort((a, b) => {
      a = a[0].toUpperCase()
      b = b[0].toUpperCase()
      return (a < b) ? -1 : (a > b) ? 1 : 0
    })
  }

  return receivers
}

export function validateDrips (drips) {
  drips = drips || []
  for (var i = 0; i < drips.length; i++) {
      if (!utils.isAddress(drips[i][0])) {
        throw new Error(`Invalid recipient: "${drips[i][0]}" is not an Ethereum address`)
      }
  }
}

export function validateSplits (splits) {
  splits = splits || []
  for (var i = 0; i < splits.length; i++) {
      if (!utils.isAddress(splits[i][0])) {
        throw new Error(`Invalid recipient: "${splits[i][0]}" is not an Ethereum address`)
      }
  }
}

export const getDripsWithdrawable = (config) => {
  // https://discord.com/channels/841318878125490186/875668327614255164/918094059732623411
  // - Look at the latest user's DripsUpdated, it has a timestamp, uint128 balance and DripsReceiver[] receivers
  // - Add up all the receiers' amtPerSec, it's totalAmtPerSec
  // - withdrawable = eventBalance - (currTimestamp - eventTimestamp) * totalAmtPerSec
  // - if withdrawable < 0, withdrawable = eventBalance % totalAmtPerSec
  try {
    const currTimestamp = Math.floor(new Date().getTime() / 1000) // sec
    const totalAmtPerSec = config.receivers.reduce((acc, curr) => acc.add(curr.amtPerSec), bn.from(0))
    const eventBalance = bn.from(config.balance)
    let withdrawable = eventBalance.sub(totalAmtPerSec.mul(currTimestamp - config.timestamp))
    if (withdrawable.lt(0)) {
      withdrawable = eventBalance.mod(totalAmtPerSec)
    }
    return withdrawable
  } catch (e) {
    console.error(e)
    return null
  }
}

export const getDripsWithdrawableFromEvent = async (event) => {
  // https://discord.com/channels/841318878125490186/875668327614255164/918094059732623411
  // - Look at the latest user's DripsUpdated, it has a timestamp, uint128 balance and DripsReceiver[] receivers
  // - Add up all the receiers' amtPerSec, it's totalAmtPerSec
  // - withdrawable = eventBalance - (currTimestamp - eventTimestamp) * totalAmtPerSec
  // - if withdrawable < 0, withdrawable = eventBalance % totalAmtPerSec
  try {
    const currTimestamp = Math.floor(new Date().getTime() / 1000) // sec
    const eventTimestamp = (await event.getBlock()).timestamp // sec
    const receivers = event.args[2]
    const totalAmtPerSec = receivers.reduce((acc, curr) => acc.add(curr[1]), bn.from(0))
    const eventBalance = event.args[1]
    let withdrawable = eventBalance.sub(totalAmtPerSec.mul(currTimestamp - eventTimestamp))
    if (withdrawable.lt(0)) {
      withdrawable = eventBalance.mod(totalAmtPerSec)
    }
    return withdrawable
  } catch (e) {
    console.error(e)
    return null
  }
}

export const validateAddressInput = input => {
  if (!utils.isAddress(input)) {
    throw new Error(`"${input}" does not resolve to an Ethereum address`)
  }
}