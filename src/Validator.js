import React, { Component } from 'react';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Badge from 'react-bootstrap/Badge';
import moment from 'moment';
import 'moment/locale/pl';

import './App.css';

class Validator extends Component {
  render() {
    return (
      <React.Fragment>
        <Row className="center">
        <Col md="4" xs={4}><strong>What the order contains</strong></Col>
        <Col xs={4}>
          <Badge className="mr-sm-2" variant='success'>Valid</Badge>
          <Badge variant='danger'>Invalid</Badge>
        </Col>
          <Col xs={4}><strong>What it should be</strong></Col>
        </Row>
        <hr className="col-xs-12"/>
        <Row>
          {this.validateNettAmount()}
          {this.validatePstaAmount()}
          {this.validateValueDate()}
          {this.validateTradeDate()}
          {this.validateRate()}
          {this.validateFundAccount()}
          {this.validateNostoAccount()}
        </Row>
      </React.Fragment>
    )
  }

  validateFundAccount() {
    let orderAccount = this.findType(this.props.orderJSON, '97', 'A', 'SAFE')[0]
    let fundAccount = this.findType(this.props.transactionJSON, '83', 'J')[0]

    if(!orderAccount || !fundAccount) { return }

    let fundAccountNumber = this.getAccountNumberFromFin(fundAccount.ast)
    let orderAccountNumber = orderAccount.ast['Account Number']

    let matchingAccount = this.props.accounts.find((mapping) => {
      return orderAccountNumber.includes(mapping.account)
    }) || {fund: 'Unknow number'}

    let validation = matchingAccount.fund === fundAccountNumber

    return this.renderType('Fund Account Number', orderAccountNumber, matchingAccount.fund, validation)
  }

  validateNostoAccount() {
    let orderAccount = this.findType(this.props.orderJSON, '97', 'A', 'SAFE')[0]
    let nostroAccount = this.findType(this.props.transactionJSON, '58', 'J')[0]

    if(!orderAccount || !nostroAccount) { return }

    let nostroAccountNumber = this.getAccountNumberFromFin(nostroAccount.ast)
    let orderAccountNumber = orderAccount.ast['Account Number']

    let matchingAccount = this.props.accounts.find((mapping) => {
      return orderAccountNumber.includes(mapping.account)
    }) || {nostro: 'Unknow number'}

    let validation = matchingAccount.nostro === nostroAccountNumber

    return this.renderType('Nostro Account Number', '', matchingAccount.nostro, validation)
  }

  getAccountNumberFromFin(ast) {
    const identify = ast['Party Identification']
    return identify.split('\n').find((line) => { return line.includes('ACCT/') }).split('/')[2]
  }

  validateRate() {
    let orderRate = this.findType(this.props.orderJSON, '92', 'B', 'EXCH')[0]
    let rate = this.findType(this.props.transactionJSON, '36')[0]
    let buy = this.findType(this.props.transactionJSON, '32', 'B')[0]
    let sell = this.findType(this.props.transactionJSON, '33', 'B')[0]

    if(!rate || !buy || !sell || !orderRate) { return }

    buy = this.renderFloat(buy.ast['Amount'])
    sell = this.renderFloat(sell.ast['Amount'])
    rate = this.renderFloat(rate.ast['Rate'])
    orderRate = this.renderFloat(orderRate.ast['Rate'])
    const computedRate = (sell / buy).toFixed(2)

    return this.renderType('Rate', orderRate, rate + ' (Calculated: ' + computedRate + ')', rate === orderRate)
  }

  validateTradeDate() {
    let orderValue = this.findType(this.props.orderJSON, '98', 'A', 'VALU')[0]
    let transactionValue = this.findType(this.props.transactionJSON, '30', 'T')[0]

    if(!orderValue || !transactionValue) { return }

    orderValue = orderValue.ast
    transactionValue = transactionValue.ast

    let orderValueDate = moment(orderValue['Date'], "YYYYMMDD")
    let correctOrderValueDate = moment(orderValue['Date'], "YYYYMMDD")

    if(!moment().isAfter(orderValueDate)) { correctOrderValueDate = moment() }

    const validation = correctOrderValueDate.format('YYYYMMDD') === transactionValue['Date']

    return this.renderType(
      'Trade Date',
      this.renderDate(orderValueDate),
      this.renderDate(correctOrderValueDate),
      validation)
  }

  validateValueDate() {
    let orderValue = this.findType(this.props.orderJSON,'98', 'A', 'VALU')[0]
    let transactionValue = this.findType(this.props.transactionJSON, '30', 'V')[0]

    if(!orderValue || !transactionValue) { return }

    orderValue = orderValue.ast
    transactionValue = transactionValue.ast

    let orderValueDate = moment(orderValue['Date'], "YYYYMMDD")
    const validation = orderValueDate.format('YYYYMMDD') === transactionValue['Date']

    return this.renderType('Value Date', this.renderDate(orderValueDate), this.renderDate(moment(transactionValue['Date'], 'YYYYMMDD')), validation)
  }


  validatePstaAmount() {
    let orderValue = this.findType(this.props.orderJSON,'19', 'B', 'PSTA')[0]
    let transactionValue = this.findType(this.props.transactionJSON, '32', 'B')[0]

    if(!orderValue || !transactionValue) { return }

    orderValue = orderValue.ast
    transactionValue = transactionValue.ast

    return this.renderAmountValidator(orderValue, transactionValue, 'Buy Currency Amount')
  }

  validateNettAmount() {
    let orderValue = this.findType(this.props.orderJSON, '19', 'B', 'NETT')[0]
    let transactionValue = this.findType(this.props.transactionJSON, '33', 'B')[0]

    if(!orderValue || !transactionValue) { return }

    orderValue = orderValue.ast
    transactionValue = transactionValue.ast

    return this.renderAmountValidator(orderValue, transactionValue, 'Sell Currency Amount')
  }

  renderAmountValidator(orderValue, transactionValue, label) {
    const validation = this.renderFloat(orderValue['Amount']) === this.renderFloat(transactionValue['Amount']) && orderValue['Currency Code'] === transactionValue['Currency']
    return this.renderType(label, this.renderCurrency(orderValue), this.renderCurrency(transactionValue), validation)
  }

  renderCurrency(ast) {
    return this.renderFloat(ast['Amount']) + " " + (ast['Currency'] || ast['Currency Code'])
  }

  renderFloat(floatSting, precision = 2) {
    return parseFloat(floatSting.replace(',', '.')).toFixed(precision)
  }

  renderDate(date) {
    return date.format('DD/MM/YYYY') + " (" + date.fromNow() + ")"
  }

  renderType(label, valueLeft, valueRight, valid) {
    const badgeVariant = valid ? 'success' : 'danger'

    return (
      <React.Fragment>
        <Col className="justify-content-center" xs={4}>{valueLeft}</Col>
        <Col className="justify-content-center" xs={4}>
          <Badge variant={badgeVariant}>{label}</Badge>
        </Col>
        <Col className="justify-content-center" xs={4}>{valueRight}</Col>
      </React.Fragment>
    )
  }

  findType(json, type, option, qualifier) {
    const details = json['block4']
    if(details) {
       return details.filter((element)=> {
         return element.type === type && element.option === option && element.ast["Qualifier"] === qualifier
       }) || []
    } else {
      return []
    }
  }
}

export default Validator;
