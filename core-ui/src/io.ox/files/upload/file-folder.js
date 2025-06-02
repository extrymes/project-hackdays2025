/*
 *
 * @copyright Copyright (c) OX Software GmbH, Germany <info@open-xchange.com>
 * @license AGPL-3.0
 *
 * This code is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with OX App Suite. If not, see <https://www.gnu.org/licenses/agpl-3.0.txt>.
 *
 * Any use of the work other than as authorized under this license or copyright law is prohibited.
 *
 */

import $ from '@/jquery'
import _ from '@/underscore'

import fileUpload from '@/io.ox/files/upload/main'
import folderApi from '@/io.ox/core/folder/api'
import yell from '@/io.ox/core/yell'

const fileFolderUpload = {}

function handleFilesUpload (updatedTreeArr, rootFolder, app, options) {
  const sortedByFolderObj = {}
  const createdFoldersByUpload = []

  // link all files in the tree with their folder id
  updatedTreeArr.forEach(function (treelayer, layerIndex) {
    treelayer.forEach(function (item) {
      // track all newly created folders by this upload
      if (!item.isFile) { createdFoldersByUpload.push(item.id); return }
      if (item.preventFileUpload) { return }
      let itemFolderId
      if (layerIndex === 0) { // is root
        itemFolderId = rootFolder
      } else {
        const parentFolderOfItem = updatedTreeArr[layerIndex - 1].find(function (parent) { return parent.isFile === false && item.parentPath === parent.path })
        itemFolderId = parentFolderOfItem.id
      }

      if (!sortedByFolderObj[itemFolderId]) { sortedByFolderObj[itemFolderId] = [] }
      sortedByFolderObj[itemFolderId].push(item.file)
    })
  })

  // push files folderwise to upload queue
  _.each(sortedByFolderObj, function (files, folderId) {
    fileUpload.setWindowNode(app.getWindowNode())

    // fill the upload queue before the upload starts to have the right number of files at start
    // notes:
    // - compared to 'offer', 'fillQueue' does no validation, validation is done in 'fileFolderUpload.upload'
    // - all folders are created in a previous step, therefore 'createdFoldersByUpload' is added as meta info for every addition to the queue
    fileUpload.fillQueue(files, _.extend({ folder: folderId, currentUploadInfo: { createdFoldersByUpload } }, options))
  })
  // start the upload with the filled queue
  fileUpload.queueChanged()
}

function createTreeObj (fileObjArray) {
  // a tree from fileObjArray
  const tree = {}
  const dirExistCheck = function (info, targetArr) {
    if (info.isFile) { return false }
    return targetArr.find(function (item) {
      return item.isFile === false && info.isFile === false && item.path === info.path && item.parentIndex === info.parentIndex
    })
  }

  fileObjArray.forEach(function (obj) {
    let fp = obj.fullPath

    if (fp[0] === '/') {
      fp = fp.substring(1)
    }

    const fpSplit = fp.split('/')
    fpSplit.forEach(function (dir, index) { // go though each path segment
      const isFile = obj.isEmptyFolder ? false : !fpSplit[(index + 1)]
      const info = {
        isFile,
        parentIndex: index === 0 ? null : (index - 1),
        parentName: index === 0 ? null : fpSplit[(index - 1)],
        name: fpSplit[index],
        index,
        id: null,
        file: isFile ? obj.file : null,
        path: _.first(fpSplit, index + 1).join('/'),
        parentPath: index === 0 ? null : _.first(fpSplit, index).join('/'),
        preventFileUpload: obj.preventFileUpload
      }
      if (tree[index.toString()]) {
        if (!dirExistCheck(info, tree[index.toString()])) {
          tree[index.toString()].push(info)
        }
      } else {
        tree[index.toString()] = [info]
      }
    })
  })

  // At this point the "tree" object holds the information about all files, their parent and respective
  // directory tree hierarchy
  return tree
}

/**
 * Traverse the given tree and create needed folders.
 * The newly received folder_ids are added to relevant items.
 */
function initiateDirCreation (tree, folder, module) {
  const treeArr = Object.values(tree)
  const folderReady = $.Deferred()
  const updatedTreeArr = []

  const getParentFolderId = function (info, updatedTreeArr) {
    if (info.parentIndex === null) {
      return folder
    }

    const parentGroup = updatedTreeArr[info.parentIndex]
    if (!parentGroup) { return folder }

    const parent = parentGroup.find(function (parentItem) { // find parent info item
      return parentItem.isFile === false && parentItem.path === info.parentPath
    })

    if (parent) {
      return parent.id
    }

    return folder
  }

  const processNextTreeLayer = async function () {
    const treeLayer = treeArr.shift()
    // create one folder after another, not concurrent
    try {
      for (const item of treeLayer) {
        if (!item.isFile) {
          const parentFolderId = getParentFolderId(item, updatedTreeArr)
          const createdFolder = await folderApi.create(parentFolderId, { title: $.trim(item.name), module, silent: parentFolderId !== folder })
          item.id = createdFolder.id // add new folder_id
        }
      }
    } catch (err) {
      yell(err)
      return folderReady.reject(err) // stop everything on folder creation error
    }

    updatedTreeArr.push(treeLayer)

    if (treeArr.length !== 0) {
      // note: next layer depends on previous layer, make sure all folders
      // are created before taking the next layer
      processNextTreeLayer()
    } else {
      folderReady.resolve(updatedTreeArr) // all folders are created
    }
  }

  if (treeArr && treeArr[0]) {
    processNextTreeLayer()
  }

  return folderReady
}

/**
 * Creates a folder structure and uploads all containing files after that.
 *
 * Pitfalls:
 * The file picker and drag & drop provide different data structures.
 * Make sure to normalize the 'fullPath' to the drag&drop behavior.
 * Consider single file upload and folder upload via filepicker.
 *
 * @param  fileObjArray An object with the following structure:
 *                      file: {}|fileObject (empty object for folders, for 'fileObject' see https://developer.mozilla.org/en-US/docs/Web/API/File)
 *                      fullPath: String (a valid path must be set, also for file upload, compare to https://wicg.github.io/entries-api/#api-entry)
 *                      preventFileUpload: true|false (whether the item should be uploaded later)
 *                      isEmptyFolder: true|false
 * @param  folder       The target folder for the upload.
 * @param  app          The used app.
 */
fileFolderUpload.upload = function (fileObjArray, folder, app, options) {
  const model = folderApi.pool.getModel(folder)
  const module = model.attributes.module

  const allFilesToUpload = _.filter(
    _.map(fileObjArray, function (item) { return item.preventFileUpload ? false : _.pick(item, 'file').file }),
    function (item) { return item !== false }
  )

  fileUpload.validateFiles(allFilesToUpload, { folder })
    .then(function () { return initiateDirCreation(createTreeObj(fileObjArray), folder, module) })
    .then(function (updatedTreeArr) { handleFilesUpload(updatedTreeArr, folder, app, options) })
}

export default fileFolderUpload
