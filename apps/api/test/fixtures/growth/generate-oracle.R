# Reproduce with pinned upstream source directories mounted at /who and fixtures at /out.
# R image: r-base:4.5.2@sha256:c84d2d97cb9c4d895b219d83a5fd480302a6ad0d2fd449f3cda7978583909a02
# Only the final two-decimal display rounding is disabled; upstream computation is unchanged.
a <- new.env()
ap <- "/who/anthro-0aa8151284fb6df50c9236048160b03c1715be90"
load(file.path(ap,"R/sysdata.rda"), envir=a)
for (f in c("anthro-package.R","assertions.R","utils.R","z-score-helper.R","z-score-length-for-age.R","z-score-weight-for-age.R","z-score-bmi-for-age.R","z-score-head-circumference-for-age.R","z-score-weight-for-lenhei.R","z-score-arm-circumference-for-age.R","z-score-triceps-skinfold-for-age.R","z-score-subscapular-skinfold-for-age.R","z-score.R")) sys.source(file.path(ap,"R",f),envir=a)
a$round <- function(x, digits=0) if (digits == 2) x else base::round(x,digits)
b <- new.env(parent=a)
load("/who/anthroplus-7cfcdb39026e9a55de55732bc3cf14c82261bcf7/R/sysdata.rda",envir=b)
sys.source("/who/anthroplus-7cfcdb39026e9a55de55732bc3cf14c82261bcf7/R/zscores.R",envir=b)
b$anthro_api_compute_zscore <- a$compute_zscore
b$anthro_api_compute_zscore_adjusted <- a$compute_zscore_adjusted
rows <- list()
for (sex in 1:2) for (days in c(0,15,274,730,731,1826,1856,1857,1860,3000,3652,3653,3683,3684,6200,6939,6969,6970,6971)) for (pos in c("L","H")) for (scale in c(0.7,1,1.3)) {
  if (days<=1856) {
    med <- function(name) { d<-get(name,envir=a); d$m[d$sex==sex & d$age==days][1] }
    len <- med("growthstandards_lenanthro")*scale
    weight <- med("growthstandards_weianthro")*scale
    head <- med("growthstandards_hcanthro")*scale
    adjusted <- a$adjust_lenhei(days,tolower(pos),len)
    direct <- function(table,value,adjust=FALSE) a$apply_zscore_and_growthstandards(if(adjust) a$compute_zscore_adjusted else a$compute_zscore,get(table,envir=a),days,sex,value)
    vals <- c(direct("growthstandards_lenanthro",adjusted),direct("growthstandards_weianthro",weight,TRUE),direct("growthstandards_hcanthro",head),direct("growthstandards_bmianthro",weight/(adjusted/100)^2,TRUE))
  } else {
    len <- 110*scale; weight<-25*scale; head<-50*scale
    height<-if(pos=="L") len-0.7 else len
    months<-days/30.4375
    vals<-c(b$zscore_height_for_age(sex,months,height),b$zscore_weight_for_age(sex,months,"n",weight),NA_real_,b$zscore_bmi_for_age(sex,months,"n",weight/(height/100)^2))
  }
  rows[[length(rows)+1]]<-data.frame(sex=sex,days=days,position=pos,lengthCm=len,weightKg=weight,headCm=head,zLength=vals[1],zWeight=vals[2],zHead=vals[3],zBmi=vals[4])
}
options(digits=17)
write.table(do.call(rbind,rows),"/out/official-oracle.csv",sep=",",row.names=FALSE,quote=FALSE,na="NA")
