/**
 * 执行入口在此
 * 通过promise异步下载pdf
 */
function ShowBook(url, first) {   //对外提供接口pdfDoc
    //url = 'http://221.5.4.232:3000/' + url; //url处理
    currPage = 1;
    $("#menuList *").remove();
    //outline = null;
    $("#pro").attr("aria-valuenow", 0).attr("style", "width:" + 0 + "%");
    $("#pro span").html('');
    pageArray.length = 0;
    if (first) {//第一次点一本书需要移除的一些东西
        $('#firstDiv').remove();
        $('#wait').removeClass('hide');
        $('#menuBtn').removeClass('hide');
        $('#prev').removeClass('hide');
        $('#next').removeClass('hide');
    }
    $('#viewer-container *').remove();
    PDFJS.getDocument(url).then(function (pdfDoc_) {
        pdfDoc = pdfDoc_;
        //pdfDoc.cleanup();  加这句出现的神奇效果。。～～！！
        //console.log(pdfDoc);
        pdfDoc.getOutline().then(function (Outline) {
            outline = Outline == null ? Outline : Outline[0];
            //console.log(outline);
            getPageArray();
        });
        (function () {
            for (var i = 1; i < CHUNK + 1; ++i) {
                var canvas = document.createElement('canvas');
                canvas.setAttribute('id', 'page' + i);
                viewer.appendChild(canvas);
                renderPage(i);
            }
        })();
    });
    return pdfDoc;
}
var CHUNK = 3;
//change23
var currPage = 1;
var averHeight = Infinity;
var pageArray = [];
var pdfDoc = null,// pdf文档，未加载时为null对象
    outline = null,//pdf.js读出来的目录，正版书有，否则为null
    pageRendering = false,
    pageNumPending = null,
    viewer = document.getElementById('viewer-container');

function viewerWidth(viewer) {
    // viewer is a DOM element
    return viewer.clientWidth;
}

/**
 * 从pdf文档中得到页面信息，根据页面的视窗比例来调整canvas，然后渲染当前页，
 * @param num 页码
 */
function renderPage(num) {
    // 开始渲染page，pageRendering标识
    pageRendering = true;
    // 用promise来从pdf文档中抓页面，本身就是异步的
    pdfDoc.getPage(num).then(function (page) {
        var scale = viewerWidth(viewer) / page.getViewport(1.0).width;//当前屏幕的缩放比例
        var viewport = page.getViewport(scale);
        var canvas = document.getElementById('page' + num);
        var ctx = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        if (averHeight > canvas.height) {
            averHeight = canvas.height;
        }
        // 把当前页渲染进canvas上下文环境
        var renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        var renderTask = page.render(renderContext);

        // 渲染任务也是一个promise进程
        renderTask.promise.then(function () {
            // 完成page渲染，pageRendering标识
            pageRendering = false;
            if (pageNumPending !== null) {
                // New page rendering is pending
                renderPage(pageNumPending);
                pageNumPending = null;
            }
        });
    });
}

/**
 * 取出目录页码存到一个全局数组，需要一定时间，所以一定时间后才调用画目录函数
 */
function getPageArray() {
    if (outline) {
        for (var i = 0; i < outline.items.length; i++) {//执行了12次，正确
            pdfDoc.getPageIndex(outline.items[i].dest[0]).then(function (pageNumber) {
//                console.log(pageNumber+1);
                pageArray.push(pageNumber + 1);
//                console.log(pageArray);
            });
//            console.log("level 1:"+outline.items[i].items.length);
            for (var j = 0; j < outline.items[i].items.length; j++) {//执行了35次，正确
                pdfDoc.getPageIndex(outline.items[i].items[j].dest[0]).then(function (pageNumber) {
                    pageArray.push(pageNumber + 1);//这里有进去数组里面
                });
//                console.log("level 2:"+outline.items[i].items[j].items.length);
                for (var k = 0; k < outline.items[i].items[j].items.length; k++) {//只执行了34次
                    pdfDoc.getPageIndex(outline.items[i].items[j].items[k].dest[0]).then(function (pageNumber) {
                        pageArray.push(pageNumber + 1);//到这里没有，为虾米？
                    });
//                    console.log("level 3:"+outline.items[i].items[j].items[k].items.length);
                    for (var l = 0; l < outline.items[i].items[j].items[k].items.length; l++) {//只执行了6次
                        pdfDoc.getPageIndex(outline.items[i].items[j].items[k].items[l].dest[0]).then(function (pageNumber) {
                            pageArray.push(pageNumber + 1);
                        });
//                        console.log("level 4:"+l);
                    }
                }
            }
        }
        var t = setTimeout(drawCatalog, 2000);
    } else {
        drawCatalog();
    }

}

function drawCatalog() {
    if (outline) {
        var req = readyOK(outline);
        //console.log(req);

//        添加书名
        var $list = $("#menuList");
        var bookName = req.bookTitle;
        $("<hr>").appendTo($list);
        $("<h2>").text(bookName).appendTo($list);
        $("<hr>").appendTo($list);
        var $cateUL = $("<ul>").appendTo($list);
//        添加目录
        for (var i = 0; i < req.catelog.length; i++) {
            var $a = $("<a>");
            var $ul = $("<ul>");
            var $li = $("<li>");
            $a.attr("page", req.catelog[i].pageNum)
                .attr("href", "#")
                .attr("target", "_self")
                .text(req.catelog[i].title);

            $a.appendTo($li);
            $li.appendTo($cateUL);
            //再加个ul>li>a层
            for (var j = 0; j < req.catelog[i].subItems.length; j++) {
                var $lij = $("<li>");
                var $aj = $("<a>");
                var $ulj = $("<ul>");
                $aj.attr("page", req.catelog[i].subItems[j].pageNum)
                    .attr("href", "#")
                    .attr("target", "_self")
                    .text(req.catelog[i].subItems[j].title);
                //再再来个ul>li>a层
                for (var k = 0; k < req.catelog[i].subItems[j].innerItems.length; k++) {
                    var $lik = $("<li>");
                    var $ak = $("<a>");
                    var $ulk = $("<ul>");
                    $ak.attr("page", req.catelog[i].subItems[j].innerItems[k].pageNum)
                        .attr("href", "#")
                        .attr("target", "_self")
                        .text(req.catelog[i].subItems[j].innerItems[k].title);
                    //再再再来个ul>li>a层
                    for (var l = 0; l < req.catelog[i].subItems[j].innerItems[k].lastItems.length; l++) {
                        var $lil = $("<li>");
                        var $al = $("<a>");
                        $al.attr("page", req.catelog[i].subItems[j].innerItems[k].lastItems[l].pageNum)
                            .attr("href", "#")
                            .attr("target", "_self")
                            .text(req.catelog[i].subItems[j].innerItems[k].lastItems[l].title);

                        $al.appendTo($lil);
                        $lil.appendTo($ulk);
                    }
                    $ak.appendTo($lik);
                    $ulk.appendTo($lik);
                    $lik.appendTo($ulj);
                }
                $aj.appendTo($lij);
                $ulj.appendTo($lij);
                $lij.appendTo($ul);
            }
            $ul.appendTo($li);
        }
    } else {
        /**
         * 目录请求读取
         */
        $.get('metadata.json', function (req, res) {
            //req.title书名
            // req.catelog[i].title章节名称 .pageNum所在页码 .level所在层数
            // req.catelog[i].subItem[j].title文章名称 .pageNum所在页码 .level所在层数

//        添加书名
            var $list = $("#menuList");
            var bookName = req.title;
            $("<hr>").appendTo($list);
            $("<h2>").text(bookName).appendTo($list);
            $("<hr>").appendTo($list);
            var $cateUL = $("<ul>").appendTo($list);
//        添加目录
            for (var i = 0; i < req.catelog.length; i++) {
                var $a = $("<a>");
                var $ul = $("<ul>");
                var $li = $("<li>");
                $a.attr("page", req.catelog[i].pageNum)
                    .attr("href", "#")
                    .attr("target", "_self")
                    .text("第" + (i + 1) + "章 " + req.catelog[i].title);

                $a.appendTo($li);
                $li.appendTo($cateUL);
                //再加个ul>li>a层
                for (var j = 0; j < req.catelog[i].subItems.length; j++) {
                    var $lij = $("<li>");
                    var $aj = $("<a>");
                    $aj.attr("page", req.catelog[i].subItems[j].pageNum)
                        .attr("href", "#")
                        .attr("target", "_self")
                        .text("»第" + (j + 1) + "节 " + req.catelog[i].subItems[j].title);

                    $aj.appendTo($lij);
                    $lij.appendTo($ul);
                }
                $ul.appendTo($li);
            }
            //console.log(req);
        });
    }
}

function readyOK(outline) {//准备好了之后把页码排序放进目录
    //console.log(pageArray.length);
    pageArray.sort(function (a, b) {
        return a - b;
    });
    //console.log(pageArray);
    var book = makeCatalog(outline);
    //下面将页码添加进目录数据结构
    return book;
}

function makeCatalog(outline) {
    var book = {
        "bookTitle": outline.title,
        "catelog": []
    };
    var p = 0;

    function Items() {
        var o = {
            "level": 1,
            "pageNum": null,
            "subItems": [],
            "title": null
        };
        return o;
    }

//        var items = {
//            "level": 1,
//            "pageNum": null,
//            "subItems": [],
//            "title": null
//        };
    function SubItems() {
        var o = {
            "level": 2,
            "pageNum": null,
            "innerItems": [],
            "title": null
        };
        return o;
    }

//        var subItem = {
//            "level": 2,
//            "pageNum": null,
//            "innerItems": [],
//            "title": null
//        };
    function InnerItems() {
        var o = {
            "level": 3,
            "pageNum": null,
            "lastItems": [],
            "title": null
        };
        return o;
    }

//        var innerItem = {
//            "level": 3,
//            "pageNum": null,
//            "lastItems": [],
//            "title": null
//        };
    function LastItems() {
        var o = {
            "level": 4,
            "pageNum": null,
            "title": null
        };
        return o;
    }

//        var lastItem = {
//            "level": 4,
//            "pageNum": null,
//            "title": null
//        };
    for (var i = 0; i < outline.items.length; i++) {
        var items = new Items();
        items.title = outline.items[i].title;//作者简介，目录概览层
        items.pageNum = pageArray[p++];
        for (var j = 0; j < outline.items[i].items.length; j++) {
            var subItem = new SubItems();
            subItem.title = outline.items[i].items[j].title;//第j章名称
            subItem.pageNum = pageArray[p++];
            for (var k = 0; k < outline.items[i].items[j].items.length; k++) {
                var innerItem = new InnerItems();
                innerItem.title = outline.items[i].items[j].items[k].title;//第j.k节名称
                innerItem.pageNum = pageArray[p++];
                for (var l = 0; l < outline.items[i].items[j].items[k].items.length; l++) {
                    var lastItem = new LastItems();
                    lastItem.title = outline.items[i].items[j].items[k].items[l].title;//j.k.l小节
                    lastItem.pageNum = pageArray[p++];
                    innerItem.lastItems.push(lastItem);
                }
                subItem.innerItems.push(innerItem);
            }
            items.subItems.push(subItem);
        }
        book.catelog.push(items);
    }
    return book;
}

$("#menuList").on('click', 'ul>li a', function () {
    var newPage = $(this).attr('page');
    if (newPage == 1) {
        $("#viewer-container :eq(0)").attr("id", "page" + (Number(newPage)));
        $("#viewer-container :eq(1)").attr("id", "page" + (Number(newPage) + 1));
        $("#viewer-container :eq(2)").attr("id", "page" + (Number(newPage) + 2));
        renderPage(Number(newPage));
        renderPage(Number(newPage) + 1);
        renderPage(Number(newPage) + 2);
    } else if (newPage > 1 && newPage < pdfDoc.numPages) {
        $("#viewer-container :eq(0)").attr("id", "page" + (Number(newPage) - 1));
        $("#viewer-container :eq(1)").attr("id", "page" + (Number(newPage)));
        $("#viewer-container :eq(2)").attr("id", "page" + (Number(newPage) + 1));
        renderPage(Number(newPage) - 1);
        renderPage(Number(newPage));
        renderPage(Number(newPage) + 1);
    } else if (newPage == pdfDoc.numPages) {
        $("#viewer-container :eq(0)").attr("id", "page" + (Number(newPage) - 2));
        $("#viewer-container :eq(1)").attr("id", "page" + (Number(newPage) - 1));
        $("#viewer-container :eq(2)").attr("id", "page" + (Number(newPage)));
        renderPage(Number(newPage) - 2);
        renderPage(Number(newPage) - 1);
        renderPage(Number(newPage));
    }
    currPage = Number(newPage);
    $(this).attr("href", "#page" + currPage);
    changePro(currPage);
});

//监听两个翻页按钮
document.getElementById('prev').addEventListener('click', function () {
    var nowID = $("#page" + currPage).attr("id");
    if (nowID) {
        if (currPage == 1) {
            return;
        }
        nowID = +nowID.substr(4);
        location.href = "#page" + (nowID - 1);
        if (currPage == pdfDoc.numPages) {
            currPage--;
            changePro(currPage);
            return;
        }
        if (currPage == 2) {
            currPage--;
            changePro(currPage);
            return;
        }
    } //不用else是因为滚动的时候会自动渲染,所以只要是翻页就一定能找到ID
});
document.getElementById('next').addEventListener('click', function () {
    var nowID = $("#page" + currPage).attr("id");
    if (nowID) {
        if (currPage == pdfDoc.numPages) {
            return;
        }
        nowID = +nowID.substr(4);
        location.href = "#page" + (nowID + 1);
        if (currPage == 1) {
            currPage++;
            changePro(currPage);
        }
    } //不用else理由同上翻页
});

//滚动监听
window.addEventListener('scroll', function () {
    if (checkLast()) {  //到最后的情况
        changePro(pdfDoc.numPages);
    }

    if (checkScrollDown()) {//滚动条向下的情况
        if (currPage == pdfDoc.numPages) {
            return;
        }
        if (currPage == pdfDoc.numPages - 1) { //加载完了
            currPage++;
            changePro(currPage);
            return;
        }
        if (currPage == 1) {
            currPage++;
            changePro(currPage);
        }
        var canvas = document.createElement('canvas');
        canvas.setAttribute('id', 'page' + (Number(currPage) + (CHUNK - 1)));
        viewer.appendChild(canvas);
        renderPage(Number(currPage) + (CHUNK - 1));
        currPage++;
        changePro(currPage);
        //viewer.firstChild.remove();
        viewer.firstChild.parentNode.removeChild(viewer.firstChild);
        //console.log('往下走了');
        $(document).scrollTop(averHeight * (CHUNK - 2));//删完记得让页面滚回去
        return;// 提高健壮性 有向下 就不向上
    }
    if (checkScrollUp()) {//滚动条向上的情况
        if (currPage < CHUNK) { //开始的情况不会补页
            return;
        }
        if (currPage == 1) changePro(currPage);
        var canvas = document.createElement('canvas');
        canvas.setAttribute('id', 'page' + (Number(currPage) - 2)); //注意ID的分配
        viewer.insertBefore(canvas, viewer.childNodes[0]);
        renderPage(Number(currPage) - 2);
        currPage--;
        changePro(currPage);
        //viewer.lastChild.remove();
        viewer.lastChild.parentNode.removeChild(viewer.lastChild);
        //console.log('往上');
        $(document).scrollTop($(document).scrollTop() + averHeight);//删完记得让页面滚下去1页
    }
    function checkScrollDown() {
        var scrollTop = $(document).scrollTop();       //滚动高度
        if (scrollTop > averHeight * (CHUNK - 1)) {
            return true;
        }
    }

    function checkScrollUp() {
        var scrollTop = $(document).scrollTop();       //滚动高度
        if (scrollTop < averHeight * 0.8) {
            return true;
        }
    }

    function checkLast() {
        return $(document).scrollTop() > averHeight * (CHUNK - 0.2);
    }
});

/**
 * 进度条随页码改变
 * @param currPage
 */
function changePro(currPage) {
    var num = pdfDoc.numPages ? currPage / pdfDoc.numPages : 0;
    $("#pro").attr("aria-valuenow", num * 100).attr("style", "width:" + (num * 100) + "%");
    $("#pro span").html(currPage + '/' + pdfDoc.numPages);
}
