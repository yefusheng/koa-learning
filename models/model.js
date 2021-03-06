const mongoose = require('mongoose');
// 新增一个Model class
class Model {
  constructor(name, schema) {
    // 保存之前更新时间戳
    schema.pre('save', function(next) {
      if (this.isNew) {
        this.createDate = this.updateDate = Date.now()
      } else {
        this.updateDate = Date.now()
      }
      next()
    })
    // 创建model
    this.model = mongoose.model(name, schema);
    this.pageSize = 10;
    this.find = this.find.bind(this); // 绑定上下文
    this.create = this.create.bind(this);
    this.findOne = this.findOne.bind(this);
  }

  count() {
    return new Promise((resolve, reject) => {
      this.model.count().exec((err, count) => {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          resolve(count);
        }
      });
    });
  }

  // 查询
  find(dataArr = {}) {
    let pageSize,
      page;
    if (dataArr.pageSize || dataArr.page) { // 如果在查询过程中传递了分页pageSize或者前页page
      pageSize = dataArr.pageSize || this.pageSize; // 使用分页
      page = dataArr.page || 1;
      dataArr.pageSize = undefined;
      dataArr.page = undefined;
      return new Promise((resolve, reject) => {
        this.model.find(dataArr).limit(pageSize).skip(pageSize * (page - 1)).sort({createDate: -1}).lean().exec((err, docs) => {
          if (err) {
            console.log(err);
            reject(err);
          } else {
            resolve(docs);
          }
        });
      })
    }
    // 如果没有传递分页，保留旧的查询
    return new Promise((resolve, reject) => {
      // 上面绑定了上下文，这里使用this.model
      this.model.find(dataArr, (err, docs) => {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          resolve(docs);
        }
      })
    })
  }

  // 查询单个
  findOne(dataArr) {
    return new Promise((resolve, reject) => {
      this.model.findOne(dataArr, (err, docs) => {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          resolve(docs);
        }
      })
    })
  }

  // 创建
  create(dataArr) {
    return new Promise((resolve, reject) => {
      let model = new this.model(dataArr);
      model.save((err, data) => {
        if (err) {
          console.log(err)
          reject(err);
          return
        }
        console.log('创建成功');
        resolve(data)
      });
    })
  }

  search(field,dataArr) {
    return new Promise((resolve, reject) => {
      const filter = dataArr.filter || {};
      const search = {}
      search[field] = {$regex: dataArr.keyword, $options: 'i'}
      this.model.find(filter).or([search]).exec((err, docs) => {
        if (err) {
          // console.log(err);
          reject(err);
        } else {
          resolve(docs);
        }
      })
    })
  }

  findOneAndUpdate(query, dataArr) {
    return new Promise((resolve, reject) => {
        this.model.findOneAndUpdate(query, dataArr, {upsert:true}, (err, doc) => {
          if (err) {
              // console.log(err);
              reject(err);
          } else {
            resolve(doc);
          }
      });
    })
  }

  findOneAndRemove(conditions) {
      return new Promise((resolve, reject) => {
          this.model.findOneAndRemove(conditions, (err, doc) => {
            if (err) {
                // console.log(err);
                reject(err);
            } else {
              resolve(doc);
            }
        });
      })
  }
}

module.exports = Model;
