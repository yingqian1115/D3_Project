const parseNA = string => (string === 'NA' ? undefined : string);
const parseDate = string => d3.timeParse('%Y-%m-%d')(string);

function type(d){
    const date = parseDate(d.release_date);
    return {
        budget: +d.budget,
        genre: parseNA(d.genre),
        genres: JSON.parse(d.genres).map(d=>d.name),
        homepage: parseNA(d.homepage),
        id: +d.id,
        imdb_id: parseNA(d.imdb_id),
        original_language: parseNA(d.original_language),
        overview: parseNA(d.overview),
        popularity: +d.popularity,
        poster_path: parseNA(d.poster_path),
        production_countries: JSON.parse(d.production_countries),
        release_date: date,
        release_year: date.getFullYear(),
        revenue: +d.revenue,
        runtime: +d.runtime,
        tagline: parseNA(d.tagline),
        title: parseNA(d.title),
        vote_average: +d.vote_average,
        vote_count: +d.vote_count
    }
}

function filterData(data){
    return data.filter(
        d => {
            return(
                d.release_year > 1999 && d.release_year < 2010 &&
                d.revenue > 0 &&
                d.budget > 0 &&
                d.genre &&
                d.title
            );
        }
    );
}

function formatTicks(d){
    return d3.format('~s')(d)
    .replace('M','mil')
    .replace('G','bil')
    .replace('T','tri')
}


// budget: "42150098"
// genre: "Animation"
// genres: "[{\"id\": 16, \"name\": \"Animation\"}, {\"id\": 35, \"name\": \"Comedy\"}, {\"id\": 10751, \"name\": \"Family\"}]"
// homepage: "http://toystory.disney.com/toy-story"
// id: "862"
// imdb_id: "tt0114709"
// original_language: "en"
// overview: "Led by Woody, Andy's toys live happily in his room until Andy's birthday brings Buzz Lightyear onto the scene. Afraid of losing his place in Andy's heart, Woody plots against Buzz. But when circumstances separate Buzz and Woody from their owner, the duo eventually learns to put aside their differences."
// popularity: "21.946943"
// poster_path: "/rhIRbceoE9lR4veEXuwCC2wARtG.jpg"
// production_countries: "[{\"iso_3166_1\": \"US\", \"name\": \"United States of America\"}]"
// release_date: "1995-10-30"
// revenue: "524844632"
// runtime: "81"
// status: "Released"
// tagline: "NA"
// title: "Toy Story"
// video: "FALSE"
// vote_average: "7.7"
// vote_count: "5415"

function prepareBarChartData(data){
    console.log(data);
    const dataMap = d3.rollup(
        data,
        v => d3.sum(v, leaf => leaf.revenue),
        d => d.genre
    );
    // debugger;    
    const dataArray = Array.from(dataMap, d=>({genre:d[0],revenue:d[1]}));
    //[...dataMap][0][0]
    //[...dataMap][0][0]
    return dataArray;
}

function prepareScatterData(data){
    return data.sort((a,b)=>b.budget-a.budget)
               .filter((d,i)=>i<100);
}

function prepareLineChartData(data){

    const groupByYear = d => d.release_year;
    const sumOfRevenue = values => d3.sum(values, d=>d.revenue);
    const sumOfRevenueByYear = d3.rollup(data, sumOfRevenue, groupByYear);
    const sumOfBudget = values => d3.sum(values, d=>d.budget);
    const sumOfBudgetByYear = d3.rollup(data, sumOfBudget,groupByYear);
    //照年份遞增排序
    const revenueArray = Array.from(sumOfRevenueByYear).sort((a,b)=>a[0]-b[0]);
    const budgetArray = Array.from(sumOfBudgetByYear).sort((a,b)=>a[0]-b[0]);
    

    //year string -> date object
    const parseYear = d3.timeParse('%Y');
    const dates = revenueArray.map(d=>parseYear(d[0]));
    
    const revenueAndBudgetArray = revenueArray.map(d=>d[1]).concat(budgetArray.map(d=>d[1]));
    
    const yMax = d3.max(revenueAndBudgetArray);
    // debugger;
    const lineData = {
        series:[
            {
                name:'Revenue',
                color:'dodgerblue',
                values:revenueArray.map(d=>({date:parseYear(d[0]),value:d[1]}))
            },
            {
                name:'Budget',
                color:'darkorange',
                values:budgetArray.map(d=>({date:parseYear(d[0]),value:d[1]}))

            }],
        dates:dates,
        yMax:yMax 
    };
    // debugger;
    return lineData;
}

function addLabel(axis, label, x, y){
    axis.selectAll('.tick:last-of-type text')
    .clone()
    .text(label)
    .attr('x',x).attr('y',y)
    .style('text-anchor','start')
    .style('font-weight','bold')
    .style('fill','#555') 
}

function setupCanvas(lineChartData){
    const svg_width = 500;
    const svg_height = 500;
    const chart_margin = {top:80,right:60,bottom:40,left:80};
    const chart_width = svg_width - (chart_margin.left + chart_margin.right);
    const chart_height = svg_height - (chart_margin.top + chart_margin.bottom);

    const this_svg = d3.select('.line-chart-container').append('svg')
    .attr('width',svg_width).attr('height',svg_height).append('g')
    .attr('transform',`translate(${chart_margin.left},${chart_margin.top})`);


    const xExtent = d3.extent(lineChartData.dates);
    //xExtent抓出最小時間(2000)與最大時間(2009)
    const xScale = d3.scaleTime().domain(xExtent).range([0,chart_width]);
    //v1: min -> max
    //range : 實際要放東西的地方
    //domain : 資料
    // const xMax = d3.max(barChartData, d=>d.revenue);
    // debugger;
    //v2 : 0 -> max
    // const xScale_v2 = d3.scaleLinear().domain([0, xMax]).range([0,chart_width]);
    //v3 : Short writing for v2
    // const xScale_v3 = d3.scaleLinear([0, xMax],[0,chart_width]);
    // const yExtent = d3.extent(scatterData, d=>d.revenue);
    const yScale = d3.scaleLinear().domain([0,lineChartData.yMax]).range([chart_height,0]);

    const lineGen = d3.line().x(d=>xScale(d.date)).y(d=>yScale(d.value));

    const chartGroup = this_svg.append('g').attr('class','line-chart');

    //出現/更新/消失
    chartGroup.selectAll('.line-series').data(lineChartData.series).enter()
            .append('path').attr('class',d=>`line-series ${d.name.toLowerCase()}`)
            .attr('d',d=>lineGen(d.values))
            .style('fill','none')
            .style('stroke', d=>d.color);

    //Draw header
    // const header = this_svg.append('g').attr('class','bar-header')
    //                .attr('transform',`translate(0,${-chart_margin.top/2})`)
    //                .append('text');
    // header.append('tspan').text('Budget vs. Revenue in $US');
    // header.append('tspan').text('Top 100 films by budget, 2000-2009')
    //                       .attr('x',0).attr('y',20)
    //                       .style('font-size','0.8em').style('fill','#555');

    // const xAxis = d3.axisBottom(xScale).ticks(5).tickFormat(formatTicks)
    //                 .tickSizeInner(-chart_height)
    //                 .tickSizeOuter(0);
    // const xAxisDraw = this_svg.append('g').attr('class','x axis')
    //                   .attr('transform',`translate(-10,${chart_height+10})`)
    //                   .call(xAxis)
    //                   .call(addLabel,'Budget',25,0);

    // xAxisDraw.selectAll('text').attr('dy','2em');

    // const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat(formatTicks)
    //                 .tickSizeInner(-chart_height)
    //                 .tickSizeOuter(0);
    // const yAxisDraw = this_svg.append('g').attr('class','y axis')
    //                   .attr('transform',`translate(-10,10)`)
    //                   .call(yAxis)
    //                   .call(addLabel,'Revenue',-30,-30);

    // yAxisDraw.selectAll('text').attr('dx','-2em');
}

//Main
function ready(movies){
    const moviesClean = filterData(movies);
    // console.log(moviesClean);
    // const barChartData = prepareBarChartData(moviesClean).sort(
    //     (a,b)=>{
    //         //return d3.descending(a.revenue, b.revenue);
    //         return b.revenue - a.revenue;
    //     }
    // );
    // const scatterData = prepareScatterData(moviesClean);
    const lineChartData = prepareLineChartData(moviesClean);

    console.log(lineChartData);
    setupCanvas(lineChartData);
}


d3.csv('data/movies.csv',type).then(
    res => {
        ready(res);
        // console.log(res);
    }
);