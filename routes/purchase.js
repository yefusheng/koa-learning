const validate = require('koa2-validation');
const Joi = require('joi');
const {purchase} = require('../controllers');
const router = require('koa-router')();

const Route = require('./route');
const convert2json = require('../utils/joi2json');
const { request, summary, query, path, body, tags } = require('koa-swagger-decorator');

const validation = {
  addPurchase: {
    body: Joi.object({
      code: Joi.number().required(), // 食材编号
      purchasingDate: Joi.date().required(), // 采购日期
      name: Joi.string().required(), // 食品名称
      manufactureDate: Joi.date(), // 生产日期
      qualityPeriod: Joi.date(), // 保质期
      quantity: Joi.number().required(), // 数量
      unit: Joi.string(), // 单位
      price: Joi.number().required(), // 单价
      totalPrice: Joi.number().required(), // 金额
      purchaserName: Joi.string().required(), // 采购人
      inspectorName: Joi.string().required(), // 收验货人
      supplierName: Joi.string().required(), // 供货人
      sign: Joi.string().required(), // 签字
      purchaseOrderId: Joi.string().required() // 所属采购单
    })
  },
  editPurchase: {
    body: Joi.object({
      id:Joi.string().required(), // 采购id
      code: Joi.number().required(), // 食材编号
      purchasingDate: Joi.date().required(), // 采购日期
      name: Joi.string().required(), // 食品名称
      manufactureDate: Joi.date(), // 生产日期
      qualityPeriod: Joi.date(), // 保质期
      quantity: Joi.number().required(), // 数量
      unit: Joi.string(), // 单位
      price: Joi.number().required(), // 单价
      totalPrice: Joi.number().required(), // 金额
      purchaserName: Joi.string().required(), // 采购人
      inspectorName: Joi.string().required(), // 收验货人
      supplierName: Joi.string().required(), // 供货人
      sign: Joi.string().required(), // 签字
      purchaseOrderId: Joi.string().required() // 所属采购单
    })
  },
  findPurchase: {
    query: Joi.object({
      page: Joi.number(), // 页码
      pageSize: Joi.number(), // 页数
      purchaseOrderId: Joi.string().required() // 采购单ID
    })
  },
  deletePurchase: {
      body: Joi.object({
        id: Joi.string().required(), // 采购id
      })
  },
  exportPurchase: {
    body: Joi.object({
      fromDate: Joi.date(), // 开始时间
      toDate: Joi.date(), // 结束时间
      purchaseOrderId: Joi.string().required(), // 采购单ID
      fileName: Joi.string().required(), // 文件名
    })
  },
}
class Purchase extends Route {
  constructor() {
    super();
  }

  @request('post', '/purchase/add')
  @summary('添加采购项目')
  @tags(['采购'])
  @body(convert2json(validation.addPurchase))
  addPurchase() {
    router.post('/add', validate(validation.addPurchase), async (ctx, next) => {
      let reqBody = ctx.request.body;
      ctx.body = await purchase.addPurchase(reqBody);
    });
  }


  @request('post', '/purchase/edit')
  @summary('修改采购项目')
  @tags(['采购'])
  @body(convert2json(validation.editPurchase))
  editPurchase() {
    router.post('/edit', validate(validation.editPurchase), async (ctx, next) => {
      let reqBody = ctx.request.body;
      ctx.body = await purchase.updatePurchase(reqBody.id, reqBody);
    });
  }

  @request('post', '/purchase/delete')
  @summary('删除采购项目')
  @tags(['采购'])
  @body(convert2json(validation.deletePurchase))
  deletePurchase() {
      router.post('/delete', validate(validation.deletePurchase), async (ctx, next) => {
        let reqBody = ctx.request.body;
        ctx.body = await purchase.deletePurchase(reqBody.id);
      });
  }

  @request('get', '/purchase/')
  @summary('查询采购项目')
  @tags(['采购'])
  @query(convert2json(validation.findPurchase))
  findPurchase() {
    router.get('/', validate(validation.findPurchase), async (ctx, next) => {
      let reqParams = ctx.query;
      ctx.body = await purchase.findPurchase(reqParams);
    });
  }

  @request('post', '/purchase/export')
  @summary('导出采购项目')
  @tags(['采购'])
  @body(convert2json(validation.exportPurchase))
  exportPurchase() {
    router.post('/export', validate(validation.exportPurchase), async (ctx, next) => {
      let reqParams = ctx.request.body;
      ctx.body = await purchase.exportPurchase(reqParams);
      ctx.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=${reqParams.fileName}.xlsx`
      });
    });
  }
}

new Purchase().route();

module.exports = router;
